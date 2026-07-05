"use client"

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { useRailSocket, type RailEvent } from "@/hooks/use-rail-socket"

/**
 * Mounted once in the dashboard layout. Listens to the org WebSocket and, for
 * any alert event, raises a global toast and plays a ping — anywhere in the
 * dashboard. The ping is synthesized with the Web Audio API so there's no asset
 * to ship and no file-autoplay quirk; the AudioContext is unlocked on the first
 * user gesture (browsers block audio until then).
 */
export function AlertListener() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | null
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        if (Ctx) audioCtxRef.current = new Ctx()
      }
      audioCtxRef.current?.resume().catch(() => {})
    }
    window.addEventListener("pointerdown", unlock)
    window.addEventListener("keydown", unlock)
    return () => {
      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("keydown", unlock)
    }
  }, [])

  function playPing() {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    // Two quick rising tones — a clear "ping".
    const tones: [number, number][] = [[880, 0], [1320, 0.13]]
    for (const [freq, offset] of tones) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      const t = now + offset
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.22)
    }
  }

  useRailSocket(token, (msg: RailEvent) => {
    if (msg.event === "alert.geofence") {
      const d = msg.data as { deviceId: string; message?: string }
      toast.warning("Geofence breach", {
        description: d.message ?? `${d.deviceId} left the safe zone`,
      })
      playPing()
    } else if (msg.event === "alert.sos") {
      const d = msg.data as { deviceId: string }
      toast.error("SOS alert", { description: `${d.deviceId} triggered an SOS` })
      playPing()
    }
  })

  return null
}
