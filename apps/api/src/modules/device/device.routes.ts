import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { devices, heartbeatLogs, telemetryLogs, alerts } from "../../db/schema.js"
import { eq, desc, sql, inArray } from "drizzle-orm"
import { authenticateDevice } from "../../middleware/authenticate-device.js"
import { authenticate } from "../../middleware/authenticate.js"
import { broadcastToOrg } from "../websocket/ws.gateway.js"
import { getActiveZones } from "../geofence/geofence.service.js"
import { isInsideAnyZone } from "../../lib/geo.js"

/* ---------------------------------------
   VALIDATION SCHEMAS
---------------------------------------- */

const heartbeatSchema = z.object({
  battery: z.number().int().min(0).max(100).optional(),
  signal: z.number().int().optional(),
  uptime: z.number().int().optional(),
  status: z.string().default("online"),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

const telemetrySchema = z.object({
  payload: z.record(z.unknown()),
})

/* ---------------------------------------
   IN-MEMORY LAST-KNOWN LOCATION
   Keyed by public deviceId. Survives until the API restarts — enough to plot
   devices on the live map without a schema migration. Replace with a DB column
   for persistence across restarts.
---------------------------------------- */
const lastLocations = new Map<string, { lat: number; lng: number; ts: number }>()

/* ---------------------------------------
   GEOFENCE TRANSITION STATE
   In-memory "inside"/"outside" per device for breach dedup (only alert on an
   inside->outside transition). Seeded from devices.geofenceStatus on a cold
   start so an API restart doesn't re-fire alerts.
---------------------------------------- */
const geofenceState = new Map<string, "inside" | "outside">()

/**
 * Evaluate a device's location against its org's active zones, dedup against the
 * last known state, and raise + broadcast a geofence alert on inside->outside.
 */
async function evaluateGeofence(
  deviceDbId: string,
  deviceId: string,
  organizationId: string,
  lat: number,
  lng: number,
): Promise<"inside" | "outside" | null> {
  const zones = await getActiveZones(organizationId)
  if (zones.length === 0) return null // geofencing not configured for this org

  const newStatus: "inside" | "outside" = isInsideAnyZone([lng, lat], zones) ? "inside" : "outside"

  // Seed transition state from the persisted column after a restart.
  let prev = geofenceState.get(deviceId)
  if (prev === undefined) {
    const [row] = await db
      .select({ s: devices.geofenceStatus })
      .from(devices)
      .where(eq(devices.id, deviceDbId))
      .limit(1)
    if (row?.s === "inside" || row?.s === "outside") prev = row.s
  }

  if (newStatus === "outside" && prev !== "outside") {
    const [alert] = await db
      .insert(alerts)
      .values({
        deviceId: deviceDbId,
        organizationId,
        type: "geofence",
        severity: "high",
        status: "active",
        lat: String(lat),
        lng: String(lng),
        triggerSource: "auto",
      })
      .returning()

    broadcastToOrg(organizationId, "alert.geofence", {
      alertId: alert.id,
      deviceId,
      type: "geofence",
      severity: "high",
      message: `${deviceId} left the safe zone`,
      lat: String(lat),
      lng: String(lng),
      ts: Date.now(),
    })
  }

  geofenceState.set(deviceId, newStatus)
  return newStatus
}

/* ---------------------------------------
   ROUTES
---------------------------------------- */

export async function deviceRoutes(app: FastifyInstance) {

  /* ---------------------------------------
     DEVICE STATS
  ---------------------------------------- */
  app.get("/stats", { preHandler: authenticate }, async (req, reply) => {
    const orgId = req.authUser!.organizationId

    const rows = await db
      .select({
        total: sql<number>`count(*)::int`,
        online: sql<number>`count(*) filter (where ${devices.isOnline} = true)::int`,
      })
      .from(devices)
      .where(eq(devices.organizationId, orgId))

    return reply.send({
      total: rows[0]?.total ?? 0,
      online: rows[0]?.online ?? 0,
      alerts: 0,
    })
  })

  /* ---------------------------------------
     GET ALL DEVICES (WITH HEARTBEATS)
  ---------------------------------------- */
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const orgId = req.authUser!.organizationId

    const orgDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.organizationId, orgId))

    if (orgDevices.length === 0) {
      return reply.send({ devices: [] })
    }

    const deviceIds = orgDevices.map(d => d.id)

    // SAFE heartbeat fetch (NO RAW SQL, NO ANY())
    const latestHeartbeats = await db
      .select({
        deviceId: heartbeatLogs.deviceId,
        battery: heartbeatLogs.battery,
        signal: heartbeatLogs.signal,
        uptime: heartbeatLogs.uptime,
        status: heartbeatLogs.status,
        createdAt: heartbeatLogs.createdAt,
      })
      .from(heartbeatLogs)
      .where(inArray(heartbeatLogs.deviceId, deviceIds))
      .orderBy(
        heartbeatLogs.deviceId,
        desc(heartbeatLogs.createdAt)
      )

    // Keep only latest heartbeat per device
    const heartbeatMap = new Map<string, any>()

    for (const hb of latestHeartbeats) {
      if (!heartbeatMap.has(hb.deviceId)) {
        heartbeatMap.set(hb.deviceId, hb)
      }
    }

    return reply.send({
      devices: orgDevices.map(device => {
        const loc = lastLocations.get(device.deviceId)
        return {
          ...device,
          latestHeartbeat: heartbeatMap.get(device.id) ?? null,
          lat: loc?.lat ?? null,
          lng: loc?.lng ?? null,
        }
      }),
    })
  })

  /* ---------------------------------------
     GET SINGLE DEVICE
  ---------------------------------------- */
  app.get("/:id", { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceId, id))
      .limit(1)

    if (!device || device.organizationId !== req.authUser!.organizationId) {
      return reply.status(404).send({ error: "Device not found" })
    }

    return reply.send({ device })
  })

  /* ---------------------------------------
     REVOKE DEVICE
  ---------------------------------------- */
  app.post("/:id/revoke", { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceId, id))
      .limit(1)

    if (!device || device.organizationId !== req.authUser!.organizationId) {
      return reply.status(404).send({ error: "Device not found" })
    }

    await db
      .update(devices)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, device.id))

    broadcastToOrg(device.organizationId, "device.revoked", {
      deviceId: id,
    })

    return reply.send({ ok: true })
  })

  /* ---------------------------------------
     HEARTBEAT (DEVICE → API)
  ---------------------------------------- */
  app.post("/heartbeat", { preHandler: authenticateDevice }, async (req, reply) => {
    const parsed = heartbeatSchema.safeParse(req.body)

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" })
    }

    const { battery, signal, uptime, status, lat, lng } = parsed.data
    const { sub: deviceDbId, organizationId, deviceId } = req.authDevice!

    let geofenceStatus: "inside" | "outside" | null = null
    if (typeof lat === "number" && typeof lng === "number") {
      lastLocations.set(deviceId, { lat, lng, ts: Date.now() })
      // May insert + broadcast a geofence alert on an inside->outside transition.
      geofenceStatus = await evaluateGeofence(deviceDbId, deviceId, organizationId, lat, lng)
    }

    await Promise.all([
      db
        .update(devices)
        .set({
          isOnline: true,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
          ...(geofenceStatus ? { geofenceStatus } : {}),
        })
        .where(eq(devices.id, deviceDbId)),

      db.insert(heartbeatLogs).values({
        deviceId: deviceDbId,
        organizationId,
        battery,
        signal,
        uptime,
        status,
      }),
    ])

    broadcastToOrg(organizationId, "device.heartbeat", {
      deviceId,
      battery,
      signal,
      uptime,
      status,
      lat,
      lng,
      ts: Date.now(),
    })

    return reply.send({ ok: true })
  })

  /* ---------------------------------------
     TELEMETRY
  ---------------------------------------- */
  app.post("/telemetry", { preHandler: authenticateDevice }, async (req, reply) => {
    const parsed = telemetrySchema.safeParse(req.body)

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" })
    }

    const { sub: deviceDbId, organizationId, deviceId } = req.authDevice!

    await db.insert(telemetryLogs).values({
      deviceId: deviceDbId,
      organizationId,
      payload: parsed.data.payload,
    })

    broadcastToOrg(organizationId, "device.telemetry", {
      deviceId,
      ...parsed.data.payload,
      ts: Date.now(),
    })

    return reply.send({ ok: true })
  })
}