import type { FastifyRequest, FastifyReply } from "fastify"
import { verifyUserToken } from "../lib/jwt.js"
import { db } from "../db/index.js"
import { sessions, revokedTokens } from "../db/schema.js"
import { eq, and, isNull, gt } from "drizzle-orm"

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing token" })
  }

  const token = authHeader.slice(7)

  let payload
  try {
    payload = verifyUserToken(token)
  } catch {
    return reply.status(401).send({ error: "Invalid or expired token" })
  }

  if (payload.type !== "access") {
    return reply.status(401).send({ error: "Invalid token type" })
  }

  // Check JTI blocklist (handles logout before expiry)
  if (payload.jti) {
    const [revoked] = await db
      .select({ id: revokedTokens.id })
      .from(revokedTokens)
      .where(eq(revokedTokens.jti, payload.jti))
      .limit(1)

    if (revoked) return reply.status(401).send({ error: "Token has been revoked" })
  }

  // Check session is still valid and not revoked
  const [session] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, payload.sessionId),
        eq(sessions.userId, payload.sub),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      )
    )
    .limit(1)

  if (!session) {
    return reply.status(401).send({ error: "Session expired or revoked" })
  }

  req.authUser = payload
}
