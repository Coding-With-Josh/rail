"use client"

import { createPortal } from "react-dom"
import type { Device } from "@/lib/mock-devices"

const statusLabel: Record<Device["status"], string> = {
  active: "Active",
  alert: "Alert",
  offline: "Offline",
  low_battery: "Low Battery",
  pol_failed: "PoL Failed",
}

const statusDot: Record<Device["status"], string> = {
  active: "#3b82f6",
  alert: "#ef4444",
  offline: "#6b7280",
  low_battery: "#f97316",
  pol_failed: "#eab308",
}

interface Props {
  device: Device
  x: number
  y: number
}

export default function HoverCard({ device, x, y }: Props) {
  const OFFSET = 14

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: x + OFFSET,
        top: y + OFFSET,
        zIndex: 9999,
        pointerEvents: "none",
        animation: "fadeIn 0.12s ease",
      }}
      className="bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-3 w-48"
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-sm font-semibold text-black dark:text-white truncate">{device.name}</p>
        <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: statusDot[device.status], flexShrink: 0 }} />
      </div>
      <p className="text-xs text-black/50 dark:text-white/50 mb-2">{statusLabel[device.status]}</p>
      <div className="flex flex-col gap-1">
        <Row label="Battery" value={device.battery > 0 ? `${device.battery}%` : "—"} />
        <Row label="Last seen" value={device.lastSeen} />
        <Row label="Org" value={device.organization} />
      </div>
    </div>,
    document.body
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-black/40 dark:text-white/40">{label}</span>
      <span className="text-xs text-black dark:text-white font-medium">{value}</span>
    </div>
  )
}
