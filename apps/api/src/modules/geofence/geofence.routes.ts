import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { geofences } from "../../db/schema.js"
import { eq, and, desc } from "drizzle-orm"
import { authenticate } from "../../middleware/authenticate.js"
import { requirePermission } from "../../middleware/require-permission.js"
import { invalidateGeofenceCache } from "./geofence.service.js"

const lngLat = z.tuple([z.number(), z.number()])

const createSchema = z.object({
  name: z.string().min(1).max(100),
  points: z.array(lngLat).min(3, "A zone needs at least 3 points"),
})

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
})

export async function geofenceRoutes(app: FastifyInstance) {
  // GET /geofences — list this org's zones
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const orgId = req.authUser!.organizationId
    const rows = await db
      .select()
      .from(geofences)
      .where(eq(geofences.organizationId, orgId))
      .orderBy(desc(geofences.createdAt))
    return reply.send({ geofences: rows })
  })

  // POST /geofences — create a zone (admin only)
  app.post("/", { preHandler: [authenticate, requirePermission("org:settings")] }, async (req, reply) => {
    const body = createSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0]?.message ?? "Invalid payload" })

    const orgId = req.authUser!.organizationId
    const [zone] = await db
      .insert(geofences)
      .values({
        organizationId: orgId,
        name: body.data.name,
        points: body.data.points,
        createdBy: req.authUser!.sub,
      })
      .returning()

    invalidateGeofenceCache(orgId)
    return reply.status(201).send({ geofence: zone })
  })

  // PATCH /geofences/:id — rename / toggle active (admin only)
  app.patch("/:id", { preHandler: [authenticate, requirePermission("org:settings")] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: "Invalid payload" })

    const orgId = req.authUser!.organizationId
    const [updated] = await db
      .update(geofences)
      .set(body.data)
      .where(and(eq(geofences.id, id), eq(geofences.organizationId, orgId)))
      .returning()

    if (!updated) return reply.status(404).send({ error: "Geofence not found" })

    invalidateGeofenceCache(orgId)
    return reply.send({ geofence: updated })
  })

  // DELETE /geofences/:id — delete (admin only)
  app.delete("/:id", { preHandler: [authenticate, requirePermission("org:settings")] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.authUser!.organizationId

    const [deleted] = await db
      .delete(geofences)
      .where(and(eq(geofences.id, id), eq(geofences.organizationId, orgId)))
      .returning({ id: geofences.id })

    if (!deleted) return reply.status(404).send({ error: "Geofence not found" })

    invalidateGeofenceCache(orgId)
    return reply.send({ ok: true })
  })
}
