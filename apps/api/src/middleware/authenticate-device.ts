import type { FastifyRequest, FastifyReply } from "fastify"
import { verifyDeviceToken } from "../lib/jwt.js"
import { db } from "../db/index.js"
import { devices } from "../db/schema.js"
import { eq, and } from "drizzle-orm"

export async function authenticateDevice(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing device token" })
  }

  const token = authHeader.slice(7)

  let payload
  try {
    payload = verifyDeviceToken(token)
  } catch {
    return reply.status(401).send({ error: "Invalid or expired device token" })
  }

  if (payload.type !== "device") {
    return reply.status(401).send({ error: "Invalid token type" })
  }

  // Verify device exists, belongs to org, and is not revoked
  const [device] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(
      and(
        eq(devices.id, payload.sub),
        eq(devices.organizationId, payload.organizationId),
        eq(devices.isRevoked, false),
      )
    )
    .limit(1)

  if (!device) {
    return reply.status(401).send({ error: "Device not found or revoked" })
  }

  req.authDevice = payload
}
