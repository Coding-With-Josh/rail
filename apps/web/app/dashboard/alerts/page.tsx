"use client";

import { useState } from "react";
import { Search, Eye, CheckCheck, TriangleAlert, ShieldAlert, HeartPulse, WifiOff, Fingerprint, X } from "lucide-react";
import { FilterDropdown } from "@/components/filter-dropdown";

const summaryCards = [
  { label: "Active Alerts", value: "7", sub: "+3 since midnight", color: "text-red-500 dark:text-red-400" },
  { label: "Critical", value: "3", sub: "Require immediate action", color: "text-orange-500 dark:text-orange-400" },
  { label: "Resolved Today", value: "12", sub: "Avg response 4 mins", color: "text-green-600 dark:text-green-400" },
  { label: "Acknowledged", value: "2", sub: "Being handled", color: "text-black/70 dark:text-white/70" },
];

const alerts = [
  { type: "Panic Alert", icon: ShieldAlert, iconClass: "text-red-500", device: "GX-042", user: "Amara Nwosu", severity: "Critical", location: "Block C, Lagos", time: "2 mins ago", status: "Active" },
  { type: "Geofence Breach", icon: TriangleAlert, iconClass: "text-orange-500", device: "GX-017", user: "Liam Chen", severity: "High", location: "Zone 4 Boundary", time: "8 mins ago", status: "Acknowledged" },
  { type: "Proof of Life", icon: HeartPulse, iconClass: "text-orange-400", device: "GX-091", user: "Sofia Martins", severity: "High", location: "Last: Block A", time: "31 mins ago", status: "Active" },
  { type: "Device Offline", icon: WifiOff, iconClass: "text-yellow-500", device: "GX-004", user: "Noah Williams", severity: "Medium", location: "Unknown", time: "1 hr ago", status: "Active" },
  { type: "Tamper Detection", icon: Fingerprint, iconClass: "text-red-400", device: "GX-033", user: "Priya Sharma", severity: "Critical", location: "Main Hall", time: "1 hr ago", status: "Acknowledged" },
  { type: "Device Offline", icon: WifiOff, iconClass: "text-yellow-500", device: "GX-011", user: "Kwame Asante", severity: "Medium", location: "Unknown", time: "2 hrs ago", status: "Resolved" },
  { type: "Geofence Breach", icon: TriangleAlert, iconClass: "text-orange-500", device: "GX-058", user: "Fatima Al-Hassan", severity: "High", location: "Zone 2 Boundary", time: "3 hrs ago", status: "Resolved" },
];

const severityStyle: Record<string, string> = {
  Critical: "bg-red-500/15 text-red-600 dark:text-red-400",
  High: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  Medium: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500",
  Low: "bg-black/8 dark:bg-white/8 text-black/50 dark:text-white/50",
};

const statusStyle: Record<string, string> = {
  Active: "bg-red-500/15 text-red-600 dark:text-red-400",
  Acknowledged: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  Resolved: "bg-green-500/15 text-green-600 dark:text-green-400",
};

export default function AlertsPage() {
  const [status, setStatus] = useState("All Status");
  const [severity, setSeverity] = useState("All Severity");
  const [type, setType] = useState("All Types");
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const isFiltered = status !== "All Status" || severity !== "All Severity" || type !== "All Types";

  function clearFilters() {
    setStatus("All Status");
    setSeverity("All Severity");
    setType("All Types");
    setPage(1);
  }

  const filtered = alerts.filter((a) =>
    (status === "All Status" || a.status === status) &&
    (severity === "All Severity" || a.severity === severity) &&
    (type === "All Types" || a.type === type)
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="flex flex-col p-4 sm:p-8 w-full gap-4">
      <div>
        <p className="text-black/80 dark:text-white/90 text-2xl font-medium tracking-tight">Alerts</p>
        <p className="text-black/50 dark:text-white/50 text-sm">Active incidents and safety events across all devices.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-sm font-medium text-black/40 dark:text-white/40">{c.label}</p>
            <p className={`text-4xl font-medium ${c.color}`}>{c.value}</p>
            <p className="text-xs text-black/30 dark:text-white/30">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/5 rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-black/8 dark:border-white/5">
          <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-lg px-3 py-1.5 flex-1 min-w-0 max-w-56">
            <Search className="size-3.5 text-black/40 dark:text-white/40 shrink-0" />
            <input placeholder="Search alerts…" className="bg-transparent text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none w-full" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FilterDropdown label="All Status" options={["All Status", "Active", "Acknowledged", "Resolved"]} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
            <FilterDropdown label="All Severity" options={["All Severity", "Critical", "High", "Medium", "Low"]} value={severity} onChange={(v) => { setSeverity(v); setPage(1); }} />
            <FilterDropdown label="All Types" options={["All Types", "Panic Alert", "Geofence Breach", "Proof of Life", "Device Offline", "Tamper Detection"]} value={type} onChange={(v) => { setType(v); setPage(1); }} />
            {isFiltered && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity">
                Clear <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-black/8 dark:border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40">Alert Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40">Device / User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40 hidden md:table-cell">Location</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40 hidden sm:table-cell">Time</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-black/40 dark:text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-black/30 dark:text-white/30">No active incidents detected</td></tr>
              ) : paginated.map((a, i) => (
                <tr key={i} className={`border-b border-black/5 dark:border-white/5 hover:bg-black/3 dark:hover:bg-white/3 transition-colors ${i === paginated.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-black/8 dark:bg-white/8 flex items-center justify-center shrink-0">
                        <a.icon className={`size-3.5 ${a.iconClass}`} />
                      </div>
                      <span className="text-sm font-medium text-black/80 dark:text-white/80">{a.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono font-medium text-black dark:text-white">{a.device}</p>
                    <p className="text-xs text-black/40 dark:text-white/40">{a.user}</p>
                  </td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityStyle[a.severity]}`}>{a.severity}</span></td>
                  <td className="px-4 py-3 text-xs text-black/50 dark:text-white/50 hidden md:table-cell">{a.location}</td>
                  <td className="px-4 py-3 text-xs text-black/50 dark:text-white/50 hidden sm:table-cell">{a.time}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[a.status]}`}>{a.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/8 dark:bg-white/8 text-xs text-black/70 dark:text-white/70 hover:bg-black/12 dark:hover:bg-white/12 transition-colors">
                        <Eye className="size-3" /> <span className="hidden sm:inline">View</span>
                      </button>
                      {a.status === "Active" && (
                        <button className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black dark:bg-white text-xs text-white dark:text-black hover:opacity-80 transition-opacity">
                          <CheckCheck className="size-3" /> Acknowledge
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-black/8 dark:border-white/5 gap-2">
          <p className="text-xs text-black/40 dark:text-white/40 shrink-0">
            {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="min-w-7 h-7 rounded-lg text-xs text-black/50 dark:text-white/50 hover:bg-black/8 dark:hover:bg-white/8 disabled:opacity-30 transition-colors">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`min-w-7 h-7 rounded-lg text-xs transition-colors ${p === page ? "bg-black dark:bg-white text-white dark:text-black font-medium" : "text-black/50 dark:text-white/50 hover:bg-black/8 dark:hover:bg-white/8"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="min-w-7 h-7 rounded-lg text-xs text-black/50 dark:text-white/50 hover:bg-black/8 dark:hover:bg-white/8 disabled:opacity-30 transition-colors">›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
