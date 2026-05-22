import type { UserTokenPayload, DeviceTokenPayload } from "../lib/jwt.js"

declare module "fastify" {
  interface FastifyRequest {
    authUser?: UserTokenPayload
    authDevice?: DeviceTokenPayload
  }
}
