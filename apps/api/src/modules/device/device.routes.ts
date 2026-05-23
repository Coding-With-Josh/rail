import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { devices, heartbeatLogs, telemetryLogs } from "../../db/schema.js"
import { eq, desc, sql, inArray } from "drizzle-orm"
import { authenticateDevice } from "../../middleware/authenticate-device.js"
import { authenticate } from "../../middleware/authenticate.js"
import { broadcastToOrg } from "../websocket/ws.gateway.js"

/* ---------------------------------------
   VALIDATION SCHEMAS
---------------------------------------- */

const heartbeatSchema = z.object({
  battery: z.number().int().min(0).max(100).optional(),
  signal: z.number().int().optional(),
  uptime: z.number().int().optional(),
  status: z.string().default("online"),
})

const telemetrySchema = z.object({
  payload: z.record(z.unknown()),
})

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
      devices: orgDevices.map(device => ({
        ...device,
        latestHeartbeat: heartbeatMap.get(device.id) ?? null,
      })),
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

    const { battery, signal, uptime, status } = parsed.data
    const { sub: deviceDbId, organizationId, deviceId } = req.authDevice!

    await Promise.all([
      db
        .update(devices)
        .set({
          isOnline: true,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
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