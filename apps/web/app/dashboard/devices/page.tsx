"use client";

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, ChevronDown, Eye, Radio, MapPin, Battery, Wifi, ShieldCheck, Clock, Activity } from "lucide-react";
import { FloatingSheet } from "@/components/floating-sheet";
import { Button } from "@/components/ui/button";
import type { Device } from "@/lib/api";

type DisplayDevice = {
  id: string;
  user: string;
  status: string;
  lastSeen: string;
  battery: number;
  geofence: string;
  alert: string | null;
  location: string;
  signal: string;
  pol: string;
};

function toDisplay(d: Device): DisplayDevice {
  const battery = d.latestHeartbeat?.battery ?? 0;
  const signal = d.latestHeartbeat?.signal ?? null;
  const minsAgo = d.lastSeenAt
    ? Math.floor((Date.now() - new Date(d.lastSeenAt).getTime()) / 60000)
    : null;
  const lastSeen = minsAgo === null ? "Never" : minsAgo < 1 ? "Just now" : `${minsAgo} mins ago`;
  const status = d.isRevoked ? "Offline" : d.isOnline ? "Active" : "Idle";

  return {
    id: d.deviceId,
    user: d.assignedUserId ?? "Unassigned",
    status,
    lastSeen,
    battery,
    geofence: "Unknown",
    alert: null,
    location: "Unknown",
    signal: signal !== null ? `${signal} dBm` : "Unknown",
    pol: "Unknown",
  };
}

const statusStyle: Record<string, string> = {
  Active: "bg-green-500/15 text-green-600 dark:text-green-400",
  Idle: "bg-black/8 dark:bg-white/8 text-black/50 dark:text-white/50",
  Offline: "bg-red-500/10 text-red-500 dark:text-red-400",
  Alert: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
};

const geofenceStyle: Record<string, string> = {
  Inside: "text-green-600 dark:text-green-400",
  Outside: "text-orange-500 dark:text-orange-400",
  Unknown: "text-black/30 dark:text-white/30",
};

function BatteryBar({ pct }: { pct: number }) {
  const color = pct > 50 ? "bg-green-500" : pct > 20 ? "bg-orange-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-black/10 dark:bg-white/10 rounded-full">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-black/50 dark:text-white/50">{pct}%</span>
    </div>
  );
}

function DeviceSheet({ device }: { device: DisplayDevice }) {
  const events = [
    { time: "Just now", label: "Heartbeat received" },
    { time: "4 mins ago", label: "Entered Zone A" },
    { time: "12 mins ago", label: "Check-in verified" },
    { time: "1 hr ago", label: "Device came online" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-black dark:text-white">{device.id}</p>
          <p className="text-sm text-black/50 dark:text-white/50">{device.user}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[device.status]}`}>{device.status}</span>
      </div>

      {/* Live Info */}
      <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wide">Live Info</p>
        {[
          { icon: MapPin, label: "Location", value: device.location },
          { icon: Clock, label: "Last Seen", value: device.lastSeen },
          { icon: Wifi, label: "Signal", value: device.signal },
          { icon: ShieldCheck, label: "Geofence", value: device.geofence },
          { icon: Activity, label: "Proof of Life", value: device.pol },
          { icon: Battery, label: "Battery", value: `${device.battery}%` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
              <Icon className="size-3.5" />{label}
            </div>
            <p className="text-xs font-medium text-black dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div>
        <p className="text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wide mb-3">Recent Activity</p>
        <div className="flex flex-col gap-3">
          {events.map((e, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/30 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm text-black/80 dark:text-white/80">{e.label}</p>
                <p className="text-xs text-black/40 dark:text-white/40">{e.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        {[
          { icon: Radio, label: "Ping Device" },
          { icon: Activity, label: "Trigger Check-In" },
          { icon: MapPin, label: "View on Map" },
          { icon: ShieldCheck, label: "Mark Safe" },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-sm text-black/70 dark:text-white/70 hover:bg-black/8 dark:hover:bg-white/8 transition-colors text-left">
            <Icon className="size-4" />{label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const [selected, setSelected] = useState<DisplayDevice | null>(null);
  const [devices, setDevices] = useState<DisplayDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/devices")
      .then(r => r.json())
      .then(data => setDevices((data.devices ?? []).map(toDisplay)))
      .catch(() => setDevices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative flex h-full w-full">
    <div className="flex flex-col p-4 sm:p-8 w-full gap-4">
    <div className="flex items-center justify-between w-full">
        <div>
        <p className="text-black/80 dark:text-white/90 text-2xl font-medium tracking-tight">Devices</p>
        <p className="text-black/50 dark:text-white/50 text-sm">Monitor and manage all enrolled devices.</p>
        </div>
        <Button className="py-3 px-3">Enroll new device</Button>
      </div>

      <div className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/5 gap-2">
          <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-lg px-3 py-1.5 flex-1 max-w-56">
            <Search className="size-3.5 text-black/40 dark:text-white/40 shrink-0" />
            <input placeholder="Search devices…" className="bg-transparent text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none w-full" />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs text-black/60 dark:text-white/60 hover:bg-black/8 dark:hover:bg-white/8 transition-colors shrink-0">
            <SlidersHorizontal className="size-3" /> <span className="hidden sm:inline">All Status</span> <ChevronDown className="size-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-black/8 dark:border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40">Device ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40">Assigned User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40 hidden md:table-cell">Last Seen</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40 hidden lg:table-cell">Battery</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40 hidden lg:table-cell">Geofence</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40 hidden xl:table-cell">Active Alert</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d, i) => (
                <tr key={d.id} onClick={() => setSelected(d)}
                  className={`border-b border-black/5 dark:border-white/5 hover:bg-black/3 dark:hover:bg-white/3 transition-colors cursor-pointer ${i === devices.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-black dark:text-white">{d.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs font-medium text-black/60 dark:text-white/60 shrink-0">
                        {d.user.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="text-black/80 dark:text-white/80 truncate">{d.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[d.status]}`}>{d.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-black/50 dark:text-white/50 hidden md:table-cell">{d.lastSeen}</td>
                  <td className="px-4 py-3 hidden lg:table-cell"><BatteryBar pct={d.battery} /></td>
                  <td className={`px-4 py-3 text-xs font-medium hidden lg:table-cell ${geofenceStyle[d.geofence]}`}>{d.geofence}</td>
                  <td className="px-4 py-3 text-xs text-black/50 dark:text-white/50 hidden xl:table-cell">{d.alert ?? <span className="text-black/20 dark:text-white/20">—</span>}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelected(d)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/8 dark:bg-white/8 text-xs text-black/70 dark:text-white/70 hover:bg-black/12 dark:hover:bg-white/12 transition-colors">
                        <Eye className="size-3" /> <span className="hidden sm:inline">View</span>
                      </button>
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/8 dark:bg-white/8 text-xs text-black/70 dark:text-white/70 hover:bg-black/12 dark:hover:bg-white/12 transition-colors hidden sm:flex">
                        <Radio className="size-3" /> Ping
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-black/8 dark:border-white/5 gap-2">
          <p className="text-xs text-black/40 dark:text-white/40 shrink-0">Showing 1–8 of 128</p>
          <div className="flex items-center gap-1">
            {["‹", "1", "2", "3", "…", "16", "›"].map((p, i) => (
              <button key={i} className={`min-w-7 h-7 rounded-lg text-xs transition-colors ${p === "1" ? "bg-black dark:bg-white text-white dark:text-black font-medium" : "text-black/50 dark:text-white/50 hover:bg-black/8 dark:hover:bg-white/8"}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      <FloatingSheet open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.id} — ${selected.user}` : ""}>
        {selected && <DeviceSheet device={selected} />}
      </FloatingSheet>
    </div>
    </div>
  );
}
