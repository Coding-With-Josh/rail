import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { alerts, devices } from "../../db/schema.js"
import { eq, and } from "drizzle-orm"
import { authenticateDevice } from "../../middleware/authenticate-device.js"
import { authenticate } from "../../middleware/authenticate.js"
import { broadcastToOrg } from "../websocket/ws.gateway.js"

const sosSchema = z.object({
  lat: z.string().optional(),
  lng: z.string().optional(),
  triggerSource: z.enum(["watch_button", "phone_button", "auto"]).default("phone_button"),
})

export async function alertRoutes(app: FastifyInstance) {
  // POST /alerts/sos — device triggers SOS
  app.post("/sos", { preHandler: authenticateDevice }, async (req, reply) => {
    const body = sosSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: "Invalid payload" })

    const { sub: deviceDbId, organizationId, deviceId } = req.authDevice!

    const [alert] = await db.insert(alerts).values({
      deviceId: deviceDbId,
      organizationId,
      type: "sos",
      severity: "critical",
      status: "active",
      lat: body.data.lat,
      lng: body.data.lng,
      triggerSource: body.data.triggerSource,
    }).returning()

    broadcastToOrg(organizationId, "alert.sos", {
      alertId: alert.id,
      deviceId,
      lat: body.data.lat,
      lng: body.data.lng,
      triggerSource: body.data.triggerSource,
      ts: Date.now(),
    })

    return reply.status(201).send({ alertId: alert.id })
  })

  // GET /alerts — list active alerts for org (dashboard)
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const orgAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.organizationId, req.authUser!.organizationId))
    return reply.send({ alerts: orgAlerts })
  })

  // POST /alerts/:id/acknowledge
  app.post("/:id/acknowledge", { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await db.update(alerts)
      .set({ status: "acknowledged", acknowledgedBy: req.authUser!.sub, acknowledgedAt: new Date() })
      .where(and(eq(alerts.id, id), eq(alerts.organizationId, req.authUser!.organizationId)))

    broadcastToOrg(req.authUser!.organizationId, "alert.acknowledged", { alertId: id })
    return reply.send({ ok: true })
  })
}
