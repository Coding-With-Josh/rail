import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { devices, heartbeatLogs, telemetryLogs } from "../../db/schema.js"
import { eq, desc, sql } from "drizzle-orm"
import { authenticateDevice } from "../../middleware/authenticate-device.js"
import { authenticate } from "../../middleware/authenticate.js"
import { broadcastToOrg } from "../websocket/ws.gateway.js"

const heartbeatSchema = z.object({
  battery: z.number().int().min(0).max(100).optional(),
  signal: z.number().int().optional(),
  uptime: z.number().int().optional(),
  status: z.string().default("online"),
})

const telemetrySchema = z.object({
  payload: z.record(z.unknown()),
})

export async function deviceRoutes(app: FastifyInstance) {
  // GET /devices/stats — org-scoped counts for dashboard
  app.get("/stats", { preHandler: authenticate }, async (req, reply) => {
    const orgId = req.authUser!.organizationId
    const rows = await db
      .select({
        total: sql<number>`count(*)::int`,
        online: sql<number>`count(*) filter (where ${devices.isOnline} = true)::int`,
      })
      .from(devices)
      .where(eq(devices.organizationId, orgId))
    return reply.send({ total: rows[0].total, online: rows[0].online, alerts: 0 })
  })

  // GET /devices — list all devices with latest heartbeat
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const orgDevices = await db.select().from(devices).where(eq(devices.organizationId, req.authUser!.organizationId))

    // Fetch latest heartbeat for each device in one query using DISTINCT ON
    const latestHeartbeats = orgDevices.length
      ? await db.execute(sql`
          SELECT DISTINCT ON (device_id) device_id, battery, signal, uptime, status, created_at
          FROM heartbeat_logs
          WHERE device_id = ANY(${orgDevices.map(d => d.id)})
          ORDER BY device_id, created_at DESC
        `)
      : { rows: [] }

    const heartbeatMap = new Map(
      (latestHeartbeats.rows as any[]).map(r => [r.device_id, r])
    )

    return reply.send({
      devices: orgDevices.map(d => ({
        ...d,
        latestHeartbeat: heartbeatMap.get(d.id) ?? null,
      })),
    })
  })

  // GET /devices/:id
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

  // POST /devices/:id/revoke
  app.post("/:id/revoke", { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const [device] = await db.select().from(devices).where(eq(devices.deviceId, id)).limit(1)
    if (!device || device.organizationId !== req.authUser!.organizationId) {
      return reply.status(404).send({ error: "Device not found" })
    }
    await db.update(devices).set({ isRevoked: true, updatedAt: new Date() }).where(eq(devices.id, device.id))
    broadcastToOrg(device.organizationId, "device.revoked", { deviceId: id })
    return reply.send({ ok: true })
  })
  // POST /device/heartbeat
  app.post("/heartbeat", { preHandler: authenticateDevice }, async (req, reply) => {
    const body = heartbeatSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: "Invalid payload" })

    const { battery, signal, uptime, status } = body.data
    const { sub: deviceDbId, organizationId } = req.authDevice!

    await Promise.all([
      db.update(devices)
        .set({ isOnline: true, lastSeenAt: new Date(), updatedAt: new Date() })
        .where(eq(devices.id, deviceDbId)),
      db.insert(heartbeatLogs).values({ deviceId: deviceDbId, organizationId, battery, signal, uptime, status }),
    ])

    broadcastToOrg(organizationId, "device.heartbeat", {
      deviceId: req.authDevice!.deviceId,
      battery,
      signal,
      uptime,
      status,
      ts: Date.now(),
    })

    return reply.send({ ok: true })
  })

  // POST /device/telemetry
  app.post("/telemetry", { preHandler: authenticateDevice }, async (req, reply) => {
    const body = telemetrySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: "Invalid payload" })

    const { sub: deviceDbId, organizationId } = req.authDevice!

    await db.insert(telemetryLogs).values({
      deviceId: deviceDbId,
      organizationId,
      payload: body.data.payload,
    })

    broadcastToOrg(organizationId, "device.telemetry", {
      deviceId: req.authDevice!.deviceId,
      ...body.data.payload,
      ts: Date.now(),
    })

    return reply.send({ ok: true })
  })
}
