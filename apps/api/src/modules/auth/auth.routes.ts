import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { eq, and, isNull, gt } from "drizzle-orm"
import { db } from "../../db/index.js"
import { users, sessions, revokedTokens, organizations } from "../../db/schema.js"
import { verifyPassword, hashPassword, hashToken, verifyToken } from "../../lib/password.js"
import { signUserAccess, verifyRefreshToken } from "../../lib/jwt.js"
import { authenticate } from "../../middleware/authenticate.js"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
})

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  organizationName: z.string().min(1).max(100),
})

const REFRESH_COOKIE = "rail_refresh"
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register — creates org + first admin user
  app.post("/register", async (req, reply) => {
    const body = registerSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: "Invalid input" })

    const { name, email, password, organizationName } = body.data

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    if (existing) return reply.status(409).send({ error: "Email already in use" })

    // Generate unique slug from org name
    const baseSlug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const slug = `${baseSlug}-${Date.now().toString(36)}`

    const passwordHash = await hashPassword(password)

    const [org] = await db.insert(organizations).values({ name: organizationName, slug }).returning({ id: organizations.id })
    await db.insert(users).values({ name, email, passwordHash, organizationId: org.id, role: "admin" })

    return reply.status(201).send({ ok: true })
  })

  // POST /auth/login
  app.post("/login", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "15 minutes",
      }
    }
  }, async (req, reply) => {
    const body = loginSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: "Invalid input" })

    const { email, password } = body.data

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    // Constant-time: always verify even if user not found (prevents timing attacks)
    const passwordValid = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, "$2a$12$invalidhashpaddingtomatchtime000000000000000000000000000")

    if (!user || !passwordValid) {
      return reply.status(401).send({ error: "Invalid credentials" })
    }

    if (user.status !== "active") {
      return reply.status(403).send({ error: "Account suspended" })
    }

    const rawRefreshToken = crypto.randomUUID() + crypto.randomUUID()
    const refreshHash = await hashToken(rawRefreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS)

    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        organizationId: user.organizationId,
        refreshTokenHash: refreshHash,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] ?? null,
        expiresAt,
      })
      .returning({ id: sessions.id })

    const accessToken = signUserAccess({
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      sessionId: session.id,
    })

    reply.setCookie(REFRESH_COOKIE, rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/auth/refresh",
      maxAge: REFRESH_TTL_MS / 1000,
    })

    return reply.send({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId },
    })
  })

  // POST /auth/refresh — rotates refresh token on every use
  app.post("/refresh", async (req, reply) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE]
    if (!rawRefreshToken) return reply.status(401).send({ error: "No refresh token" })

    let payload
    try {
      payload = verifyRefreshToken(rawRefreshToken)
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" })
    }

    const [session] = await db
      .select()
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

    if (!session || !(await verifyToken(rawRefreshToken, session.refreshTokenHash))) {
      // Possible token reuse — revoke session immediately
      if (session) {
        await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id))
      }
      return reply.status(401).send({ error: "Session invalid or expired" })
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1)
    if (!user || user.status !== "active") {
      return reply.status(401).send({ error: "User unavailable" })
    }

    // Rotate: issue new refresh token, invalidate old
    const newRawRefreshToken = crypto.randomUUID() + crypto.randomUUID()
    const newRefreshHash = await hashToken(newRawRefreshToken)
    const newExpiresAt = new Date(Date.now() + REFRESH_TTL_MS)

    await db
      .update(sessions)
      .set({ refreshTokenHash: newRefreshHash, expiresAt: newExpiresAt })
      .where(eq(sessions.id, session.id))

    const accessToken = signUserAccess({
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      sessionId: session.id,
    })

    reply.setCookie(REFRESH_COOKIE, newRawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/auth/refresh",
      maxAge: REFRESH_TTL_MS / 1000,
    })

    return reply.send({ accessToken })
  })

  // POST /auth/logout
  app.post("/logout", { preHandler: authenticate }, async (req, reply) => {
    const { sessionId, jti } = req.authUser!

    // Revoke session
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId))

    // Blocklist the access token JTI so it can't be reused within its remaining TTL
    if (jti) {
      const ttlMs = 15 * 60 * 1000 // matches ACCESS_TTL
      await db.insert(revokedTokens).values({
        jti,
        expiresAt: new Date(Date.now() + ttlMs),
      }).onConflictDoNothing()
    }

    reply.clearCookie(REFRESH_COOKIE, { path: "/auth/refresh" })
    return reply.send({ ok: true })
  })

  // GET /auth/me
  app.get("/me", { preHandler: authenticate }, async (req, reply) => {
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, organizationId: users.organizationId, status: users.status })
      .from(users)
      .where(eq(users.id, req.authUser!.sub))
      .limit(1)

    if (!user) return reply.status(404).send({ error: "User not found" })
    return reply.send({ user })
  })
}
