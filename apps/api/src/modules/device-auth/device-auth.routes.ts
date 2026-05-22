import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { eq, and, gt, isNull } from "drizzle-orm"
import { db } from "../../db/index.js"
import { devices, deviceSessions, pairingSessions } from "../../db/schema.js"
import { hashToken, verifyToken } from "../../lib/password.js"
import { signDeviceAccess } from "../../lib/jwt.js"
import { authenticate } from "../../middleware/authenticate.js"

const bootstrapSchema = z.object({
  hardwareId: z.string().min(1),
  firmwareVersion: z.string().min(1),
  capabilities: z.array(z.string()).default([]),
})

const approveSchema = z.object({
  pairingCode: z.string().min(1),
  organizationId: z.string().min(1),
  assignedUserId: z.string().optional(),
})

const DEVICE_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000
const PAIRING_TTL_MS = 10 * 60 * 1000

export async function deviceAuthRoutes(app: FastifyInstance) {
  // GET /device/pairing/status?code=XXX — device polls this to check if approved
  // No auth — device doesn't have a token yet. Returns credentials only once, then clears them.
  app.get("/pairing/status", async (req, reply) => {
    const { code } = req.query as { code?: string }
    if (!code) return reply.status(400).send({ error: "Missing code" })

    const [pairing] = await db
      .select()
      .from(pairingSessions)
      .where(eq(pairingSessions.pairingCode, code))
      .limit(1)

    if (!pairing) return reply.status(404).send({ error: "Pairing session not found" })

    if (pairing.state !== "approved" || !pairing.provisionedSecret) {
      return reply.send({ state: pairing.state })
    }

    // One-time credential delivery — clear the plaintext secret after sending
    const secret = pairing.provisionedSecret
    const [device] = await db
      .select({ deviceId: devices.deviceId })
      .from(devices)
      .where(eq(devices.id, pairing.provisionedDeviceId!))
      .limit(1)

    await db
      .update(pairingSessions)
      .set({ provisionedSecret: null })
      .where(eq(pairingSessions.id, pairing.id))

    return reply.send({ state: "approved", deviceId: device.deviceId, secret })
  })

  // GET /device/pairing/pending — list pending pairing sessions for org
  app.get("/pairing/pending", { preHandler: authenticate }, async (req, reply) => {
    const sessions = await db
      .select()
      .from(pairingSessions)
      .where(
        and(
          eq(pairingSessions.state, "pending"),
          gt(pairingSessions.expiresAt, new Date()),
        )
      )
    return reply.send({ sessions })
  })
  // POST /device/bootstrap
  app.post("/bootstrap", async (req, reply) => {
    const body = bootstrapSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: "Invalid payload" })

    const { hardwareId, firmwareVersion, capabilities } = body.data
    const pairingCode = Math.random().toString(36).slice(2, 8).toUpperCase()
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MS)

    const [session] = await db
      .insert(pairingSessions)
      .values({ hardwareId, firmwareVersion, capabilities, pairingCode, expiresAt })
      .returning({ pairingCode: pairingSessions.pairingCode })

    // TODO: broadcast device.pairing_requested via WebSocket

    return reply.status(201).send({ pairingCode: session.pairingCode, expiresIn: 600 })
  })

  // POST /device/approve — admin approves a pairing
  app.post("/approve", { preHandler: authenticate }, async (req, reply) => {
    const body = approveSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: "Invalid payload" })

    const { pairingCode, organizationId, assignedUserId } = body.data

    if (req.authUser!.organizationId !== organizationId) {
      return reply.status(403).send({ error: "Organization mismatch" })
    }

    const [pairing] = await db
      .select()
      .from(pairingSessions)
      .where(and(
        eq(pairingSessions.pairingCode, pairingCode),
        eq(pairingSessions.state, "pending"),
        gt(pairingSessions.expiresAt, new Date()),
      ))
      .limit(1)

    if (!pairing) return reply.status(404).send({ error: "Pairing session not found or expired" })

    const deviceSecret = crypto.randomUUID() + crypto.randomUUID()
    const secretHash = await hashToken(deviceSecret)
    const deviceId = `GX-${Date.now().toString(36).toUpperCase()}`

    const [device] = await db
      .insert(devices)
      .values({ deviceId, organizationId, assignedUserId: assignedUserId ?? null, secretHash, firmwareVersion: pairing.firmwareVersion, capabilities: pairing.capabilities })
      .returning()

    await db
      .update(pairingSessions)
      .set({ state: "approved", organizationId, assignedUserId: assignedUserId ?? null, approvedBy: req.authUser!.sub, provisionedDeviceId: device.id, provisionedSecret: deviceSecret })
      .where(eq(pairingSessions.id, pairing.id))

    return reply.status(201).send({
      deviceId: device.deviceId,
      deviceSecret,
      message: "Device approved. Call /device/token to receive JWT.",
    })
  })

  // POST /device/token — exchange secret for tokens
  app.post("/token", async (req, reply) => {
    const body = z.object({ deviceId: z.string(), secret: z.string() }).safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: "Invalid payload" })

    const { deviceId, secret } = body.data

    const [device] = await db
      .select()
      .from(devices)
      .where(and(eq(devices.deviceId, deviceId), eq(devices.isRevoked, false)))
      .limit(1)

    if (!device || !(await verifyToken(secret, device.secretHash))) {
      return reply.status(401).send({ error: "Invalid device credentials" })
    }

    // Raw UUID refresh token stored as hash (same pattern as user sessions)
    const rawRefreshToken = crypto.randomUUID() + crypto.randomUUID()
    const refreshHash = await hashToken(rawRefreshToken)
    const expiresAt = new Date(Date.now() + DEVICE_REFRESH_TTL_MS)

    await db.insert(deviceSessions).values({
      deviceId: device.id,
      organizationId: device.organizationId,
      refreshTokenHash: refreshHash,
      expiresAt,
    })

    const accessToken = signDeviceAccess({
      sub: device.id,
      deviceId: device.deviceId,
      organizationId: device.organizationId,
      capabilities: device.capabilities ?? [],
    })

    return reply.send({ accessToken, refreshToken: rawRefreshToken })
  })

  // POST /device/refresh — exchange refresh token for new access token
  app.post("/refresh", async (req, reply) => {
    const body = z.object({ deviceId: z.string(), refreshToken: z.string() }).safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: "Invalid payload" })

    const { deviceId, refreshToken } = body.data

    const [device] = await db
      .select()
      .from(devices)
      .where(and(eq(devices.deviceId, deviceId), eq(devices.isRevoked, false)))
      .limit(1)

    if (!device) return reply.status(401).send({ error: "Device not found or revoked" })

    const [session] = await db
      .select()
      .from(deviceSessions)
      .where(and(
        eq(deviceSessions.deviceId, device.id),
        isNull(deviceSessions.revokedAt),
        gt(deviceSessions.expiresAt, new Date()),
      ))
      .limit(1)

    if (!session || !(await verifyToken(refreshToken, session.refreshTokenHash))) {
      if (session) await db.update(deviceSessions).set({ revokedAt: new Date() }).where(eq(deviceSessions.id, session.id))
      return reply.status(401).send({ error: "Invalid or expired refresh token" })
    }

    // Rotate refresh token
    const newRaw = crypto.randomUUID() + crypto.randomUUID()
    const newHash = await hashToken(newRaw)
    await db.update(deviceSessions)
      .set({ refreshTokenHash: newHash, expiresAt: new Date(Date.now() + DEVICE_REFRESH_TTL_MS) })
      .where(eq(deviceSessions.id, session.id))

    const accessToken = signDeviceAccess({
      sub: device.id,
      deviceId: device.deviceId,
      organizationId: device.organizationId,
      capabilities: device.capabilities ?? [],
    })

    return reply.send({ accessToken, refreshToken: newRaw })
  })
}
