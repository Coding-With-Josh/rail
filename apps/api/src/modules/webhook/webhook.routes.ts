import type { FastifyInstance } from "fastify"
import { eq } from "drizzle-orm"
import { db } from "../../db/index.js"
import { devices, telemetryLogs, heartbeatLogs } from "../../db/schema.js"
import { broadcastToOrg } from "../websocket/ws.gateway.js"

/**
 * Public webhook receiver for inbound third-party payloads (PCAPdroid/companion app).
 *
 * The webhook resolves the incoming device using the existing `devices.device_id`
 * column first, and only falls back to a `device_identifiers` mapping if that
 * table exists in the database.
 */
export async function webhookRoutes(app: FastifyInstance) {
  app.post("/watch-data", async (req, reply) => {
    const body = req.body as any
    const query = req.query as any

    const macRaw = (body?.mac ?? body?.data?.mac ?? body?.data?.deviceMac ?? body?.macAddress) as string | undefined
    const mac = macRaw ? String(macRaw).toLowerCase() : undefined

    const lookupCandidates = [
      query?.deviceId,
      query?.device_id,
      query?.id,
      body?.deviceId,
      body?.device_id,
      body?.deviceID,
      body?.id,
      body?.data?.deviceId,
      body?.data?.device_id,
      body?.data?.deviceID,
      body?.data?.id,
      mac,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0)

    let device: any

    try {
      for (const candidate of lookupCandidates) {
        ;[device] = await db
          .select()
          .from(devices)
          .where(eq(devices.deviceId, candidate))
          .limit(1)

        if (device) break
      }
    } catch (err: any) {
      req.log?.error?.(err, "DB lookup failed for webhook")
      return reply.status(502).send({ error: "Database error while looking up device" })
    }

    if (!device) return reply.status(404).send({ error: "Device not found (device_id not found)" })

    // Persist raw payload to telemetry logs for debugging and future parsing
    try {
      await db.insert(telemetryLogs).values({
        deviceId: device.id,
        organizationId: device.organizationId,
        payload: body,
      })
    } catch (err: any) {
      req.log?.error?.(err, 'DB insert telemetry failed')
      return reply.status(502).send({ error: 'Database error while saving telemetry' })
    }

    // Broadcast to any connected dashboards
    try {
      broadcastToOrg(device.organizationId, "device.telemetry", {
        deviceId: device.deviceId,
        ...(typeof body === "object" ? body : { raw: body }),
        ts: Date.now(),
      })
    } catch (e) {
      // non-fatal
    }

    // If the payload contains simple lat/lon, insert a heartbeat log and mark online
    const latRaw = body?.data?.lat ?? body?.lat ?? body?.data?.latitude
    const lonRaw = body?.data?.lon ?? body?.lng ?? body?.data?.longitude

    const lat = latRaw ? Number(latRaw) : null
    const lng = lonRaw ? Number(lonRaw) : null

    if (typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      try {
        await db
          .update(devices)
          .set({ isOnline: true, lastSeenAt: new Date(), updatedAt: new Date() })
          .where(eq(devices.id, device.id))

        await db.insert(heartbeatLogs).values({
          deviceId: device.id,
          organizationId: device.organizationId,
          battery: null,
          signal: null,
          uptime: null,
          status: "online",
        })
      } catch (err: any) {
        req.log?.error?.(err, 'DB update/insert heartbeat failed')
        return reply.status(502).send({ error: 'Database error while saving heartbeat' })
      }
    }

    return reply.send({ ok: true })
  })
}
