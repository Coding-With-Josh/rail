import type { FastifyInstance } from "fastify"
import type { WebSocket } from "@fastify/websocket"
import { verifyUserToken, verifyDeviceToken } from "../../lib/jwt.js"

// org -> set of connected sockets
const orgSockets = new Map<string, Set<WebSocket>>()

export function broadcastToOrg(orgId: string, event: string, data: unknown) {
  const sockets = orgSockets.get(orgId)
  if (!sockets) return
  const message = JSON.stringify({ event, data, ts: Date.now() })
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) ws.send(message)
  }
}

export async function wsGateway(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, (socket, req) => {
    // Auth: expect ?token=<jwt> in query string
    const token = (req.query as Record<string, string>).token
    if (!token) {
      socket.close(4001, "Missing token")
      return
    }

    let orgId: string
    try {
      // Accept both user and device tokens
      try {
        const payload = verifyUserToken(token)
        orgId = payload.organizationId
      } catch {
        const payload = verifyDeviceToken(token)
        orgId = payload.organizationId
      }
    } catch {
      socket.close(4001, "Invalid token")
      return
    }

    if (!orgSockets.has(orgId)) orgSockets.set(orgId, new Set())
    orgSockets.get(orgId)!.add(socket)

    socket.on("close", () => {
      orgSockets.get(orgId)?.delete(socket)
    })
  })
}
