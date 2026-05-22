"use client"

import { X, Navigation, Radio, AlertTriangle, Battery, Signal, MapPin, Clock, ShieldCheck, ShieldAlert } from "lucide-react"
import type { Device } from "@/lib/mock-devices"

const statusBadge: Record<Device["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  alert: { label: "Alert", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
  offline: { label: "Offline", className: "bg-black/10 dark:bg-white/10 text-black/50 dark:text-white/50" },
  low_battery: { label: "Low Battery", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  pol_failed: { label: "PoL Failed", className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500" },
}

interface Props {
  device: Device
  onClose: () => void
}

export default function DeviceSideSheet({ device, onClose }: Props) {
  const badge = statusBadge[device.status]

  return (
    <div className="absolute top-0 right-0 h-full w-80 z-20 flex flex-col bg-white dark:bg-[#161616] border-l border-black/10 dark:border-white/8 rounded-r-2xl overflow-hidden shadow-2xl animate-in slide-in-from-right duration-200">

      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-black/8 dark:border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-black/8 dark:bg-white/8 flex items-center justify-center text-sm font-bold text-black dark:text-white">
            {device.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold text-black dark:text-white">{device.name}</p>
            <p className="text-xs font-mono text-black/40 dark:text-white/40">{device.deviceId}</p>
          </div>
        </div>
        <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg hover:bg-black/8 dark:hover:bg-white/8 transition-colors">
          <X className="size-3.5 text-black/50 dark:text-white/50" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Status row */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-black/8 dark:border-white/8">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span>
          <div className="flex items-center gap-1 ml-auto">
            <Battery className="size-3.5 text-black/40 dark:text-white/40" />
            <span className="text-xs text-black/60 dark:text-white/60">{device.battery > 0 ? `${device.battery}%` : "—"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Signal className="size-3.5 text-black/40 dark:text-white/40" />
            <span className="text-xs text-black/60 dark:text-white/60">{device.signal > 0 ? `${device.signal}/5` : "—"}</span>
          </div>
        </div>

        {/* Alert section — only if alert active */}
        {device.alert && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="size-3.5 text-red-500" />
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">{device.alert.type}</p>
            </div>
            <p className="text-xs text-red-500/70">{device.alert.severity} · {device.alert.triggeredAt}</p>
          </div>
        )}

        {/* Live status */}
        <Section title="Live Status">
          <Row icon={<Radio className="size-3.5" />} label={device.status === "offline" ? "Offline" : "Online"} />
          <Row icon={<Clock className="size-3.5" />} label={`Heartbeat: ${device.heartbeat}`} />
          <Row
            icon={device.polStatus === "verified" ? <ShieldCheck className="size-3.5 text-green-500" /> : <ShieldAlert className="size-3.5 text-yellow-500" />}
            label={`Proof of Life: ${device.polStatus === "verified" ? "Verified" : device.polStatus === "missed" ? "Missed" : "Failed"}`}
          />
          <Row
            icon={<MapPin className="size-3.5" />}
            label={device.geofenceStatus === "inside" ? "Inside safe zone" : "Outside safe zone"}
            valueClass={device.geofenceStatus === "outside" ? "text-red-500" : "text-green-600 dark:text-green-400"}
          />
        </Section>

        {/* Location */}
        <Section title="Location">
          <Row icon={<MapPin className="size-3.5" />} label={device.location} />
          <Row icon={<Navigation className="size-3.5" />} label={`${device.coordinates[1].toFixed(4)}, ${device.coordinates[0].toFixed(4)}`} />
          <p className="text-xs text-black/30 dark:text-white/30 mt-1">Last seen {device.lastSeen}</p>
        </Section>

        {/* Activity Timeline */}
        <Section title="Activity">
          <div className="flex flex-col gap-2">
            {device.timeline.map((t, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center gap-1 mt-0.5">
                  <div className="size-1.5 rounded-full bg-black/30 dark:bg-white/30 shrink-0" />
                  {i < device.timeline.length - 1 && <div className="w-px flex-1 bg-black/10 dark:bg-white/10 min-h-3" />}
                </div>
                <div className="pb-1">
                  <p className="text-xs text-black dark:text-white">{t.event}</p>
                  <p className="text-xs text-black/30 dark:text-white/30">{t.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

      </div>

      {/* Actions */}
      <div className="p-4 border-t border-black/8 dark:border-white/8 flex gap-2 shrink-0">
        <button className="flex-1 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-medium hover:opacity-80 transition-opacity">
          Focus Device
        </button>
        <button className="flex-1 py-2 rounded-xl bg-black/8 dark:bg-white/8 text-black dark:text-white text-xs font-medium hover:bg-black/12 dark:hover:bg-white/12 transition-colors">
          Monitor
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-black/8 dark:border-white/8">
      <p className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function Row({ icon, label, valueClass }: { icon: React.ReactNode; label: string; valueClass?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-black/70 dark:text-white/70 ${valueClass ?? ""}`}>
      <span className="text-black/30 dark:text-white/30">{icon}</span>
      {label}
    </div>
  )
}
