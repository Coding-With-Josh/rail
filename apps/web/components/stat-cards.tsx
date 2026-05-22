"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRailSocket } from "@/hooks/use-rail-socket"

type Stats = { total: number; online: number; alerts: number }

export function StatCards() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | null
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch("/api/devices/stats")
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  // Live update online count on heartbeat/revoke events
  useRailSocket(token, (msg) => {
    if (msg.event === "device.heartbeat") {
      setStats(s => s ? { ...s, online: s.online } : s) // heartbeat confirms online; full recount on revoke
    }
    if (msg.event === "device.revoked") {
      setStats(s => s ? { ...s, online: Math.max(0, s.online - 1) } : s)
    }
  })

  const cards = [
    {
      label: "Devices Online",
      value: stats ? `${stats.online}` : "—",
      sub: stats ? `of ${stats.total} enrolled` : "loading…",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-black/40 dark:text-white/60">
          <rect x="6" y="5" width="8" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 5V3.5a1 1 0 011-1h2a1 1 0 011 1V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M8 15v1.5a1 1 0 001 1h2a1 1 0 001-1V15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="10" cy="10" r="1.2" fill="currentColor"/>
        </svg>
      ),
    },
    {
      label: "Active Alerts",
      value: stats ? `${stats.alerts}` : "—",
      sub: "right now",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-black/40 dark:text-white/60">
          <path d="M10 3a5 5 0 015 5v3.5l1.5 2H3.5L5 11.5V8a5 5 0 015-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          <path d="M8 16.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Total Enrolled",
      value: stats ? `${stats.total}` : "—",
      sub: "across organisation",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-black/40 dark:text-white/60">
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M7 10.5l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
      {cards.map((s) => (
        <div key={s.label} className="bg-black/5 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/8 border border-black/8 dark:border-white/5 rounded-xl p-4 flex flex-col gap-3 transition-all">
          {s.icon}
          <div>
            <p className="text-xs text-black/40 dark:text-white/50 mb-1">{s.label}</p>
            <p className="text-2xl font-medium text-black dark:text-white">{s.value}</p>
          </div>
          <p className="text-xs text-black/30 dark:text-white/40">{s.sub}</p>
        </div>
      ))}
    </div>
  )
}
