import type { FastifyRequest, FastifyReply } from "fastify"

const ROLE_PERMISSIONS = {
  admin:    ["devices:read", "devices:write", "devices:command", "alerts:read", "alerts:acknowledge", "alerts:resolve", "users:read", "users:write", "org:settings"],
  operator: ["devices:read", "devices:command", "alerts:read", "alerts:acknowledge"],
  viewer:   ["devices:read", "alerts:read"],
} as const

type Permission = (typeof ROLE_PERMISSIONS)[keyof typeof ROLE_PERMISSIONS][number]

export function requirePermission(permission: Permission) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const role = req.authUser?.role
    if (!role) return reply.status(401).send({ error: "Unauthenticated" })

    const allowed = ROLE_PERMISSIONS[role] as readonly string[]
    if (!allowed.includes(permission)) {
      return reply.status(403).send({ error: "Insufficient permissions" })
    }
  }
}
