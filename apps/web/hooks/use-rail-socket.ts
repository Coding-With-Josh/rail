"use client"

import { useEffect, useRef, useCallback } from "react"

export type RailEvent =
  | { event: "device.heartbeat"; data: { deviceId: string; battery?: number; signal?: number; status: string; lat?: number; lng?: number; ts: number } }
  | { event: "alert.sos"; data: { alertId: string; deviceId: string; lat?: string; lng?: string; ts: number } }
  | { event: "alert.geofence"; data: { alertId: string; deviceId: string; type: string; severity: string; message: string; lat?: string; lng?: string; ts: number } }
  | { event: "device.online" | "device.offline" | "device.revoked"; data: { deviceId: string } }
  | { event: string; data: unknown }

type Handler = (msg: RailEvent) => void

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws"

export function useRailSocket(token: string | null, onMessage: Handler) {
  const ws = useRef<WebSocket | null>(null)
  const handler = useRef(onMessage)
  handler.current = onMessage

  const connect = useCallback(() => {
    if (!token) return
    ws.current?.close()

    const socket = new WebSocket(`${WS_URL}?token=${token}`)
    ws.current = socket

    socket.onmessage = (e) => {
      try { handler.current(JSON.parse(e.data)) } catch {}
    }

    socket.onclose = (e) => {
      // Reconnect unless closed intentionally (code 4001 = auth failure)
      if (e.code !== 4001) setTimeout(connect, 3000)
    }
  }, [token])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])
}
