import Fastify from "fastify"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import websocket from "@fastify/websocket"
import rateLimit from "@fastify/rate-limit"
import { authRoutes } from "./modules/auth/auth.routes.js"
import { deviceAuthRoutes } from "./modules/device-auth/device-auth.routes.js"
import { deviceRoutes } from "./modules/device/device.routes.js"
import { wsGateway } from "./modules/websocket/ws.gateway.js"

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true, credentials: true })
  await app.register(cookie)
  await app.register(websocket)
  await app.register(rateLimit, { global: false }) // opt-in per route

  app.get("/", async () => ({ message: "Rail API running", version: "0.1.0" }))
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }))

  await app.register(authRoutes, { prefix: "/auth" })
  await app.register(deviceAuthRoutes, { prefix: "/device" })
  await app.register(deviceRoutes, { prefix: "/device" })   // heartbeat, telemetry
  await app.register(deviceRoutes, { prefix: "/devices" })  // list, get, revoke
  await app.register(wsGateway)

  return app
}
