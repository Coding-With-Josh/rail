import { StatCards } from "@/components/stat-cards";
import { Filter, RefreshCcw, ArrowRight, Settings, TrendingUp, TriangleAlert, BatteryLow, CheckCircle } from "lucide-react";

const hourlyBars = [30, 55, 40, 70, 50, 85, 45, 65, 55, 80, 35, 60];

const recentAlerts = [
  { icon: TriangleAlert, iconClass: "text-orange-500", label: "Geofence Breach", sub: "GX-042 · 4 mins ago", badge: "Critical" },
  { icon: BatteryLow, iconClass: "text-yellow-500", label: "Low Battery", sub: "GX-017 · 12 mins ago", badge: "Warning" },
  { icon: CheckCircle, iconClass: "text-green-500", label: "Proof of Life Missed", sub: "GX-091 · 31 mins ago", badge: "Resolved" },
];

const badgeColor: Record<string, string> = {
  Critical: "text-red-500 dark:text-red-400",
  Warning: "text-orange-500 dark:text-orange-400",
  Resolved: "text-green-600 dark:text-green-400",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col p-4 sm:p-8 w-full gap-4">

      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div>
          <p className="text-black/80 dark:text-white/90 text-lg sm:text-2xl font-medium tracking-tight">Welcome back, Admin!</p>
          <p className="text-black/50 dark:text-white/50 text-xs sm:text-sm">Here's an overview of your enrolled devices.</p>
        </div>
        <div className="flex gap-2">
          {[Filter, RefreshCcw].map((Icon, i) => (
            <div key={i} className="bg-black/8 dark:bg-white/8 hover:bg-black/12 dark:hover:bg-white/12 size-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors">
              <Icon className="size-3.5 text-black/60 dark:text-white/60" />
            </div>
          ))}
        </div>
      </div>

      {/* grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">

        {/* Stat cards row */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-3"><StatCards /></div>

        {/* Statistics — full on mobile, 2 cols on sm+ */}
        <div className="col-span-1 sm:col-span-2 bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/5 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-black dark:text-white">Statistics</h2>
            <div className="flex gap-5">
              {[["Devices Online", "214"], ["Alerts Today", "7"]].map(([label, val], i) => (
                <div key={i}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${i === 0 ? "bg-black dark:bg-white" : "bg-black/40 dark:bg-white/40"}`} />
                    <span className="text-xs text-black/40 dark:text-white/40">{label}</span>
                  </div>
                  <p className="text-sm font-semibold text-black dark:text-white">{val}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-1 h-14 shrink-0 overflow-hidden">
            {hourlyBars.map((h, i) => (
              <div key={i} className="flex gap-0.5 items-end">
                <div className="w-1.5 rounded-t-sm bg-black/60 dark:bg-white/60" style={{ height: `${h * 0.75}%` }} />
                <div className="w-1.5 rounded-t-sm bg-black/20 dark:bg-white/20" style={{ height: `${h * 0.45}%` }} />
              </div>
            ))}
          </div>
        </div>

        {/* Active Monitoring */}
        <div className="bg-black/8 dark:bg-white/8 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-xs text-black/40 dark:text-white/40">12 Organizations</p>
            <span className="text-xs bg-black/10 dark:bg-white/10 text-black dark:text-white px-2 py-0.5 rounded-full">● Live</span>
          </div>
          <div>
            <p className="text-xs text-black/40 dark:text-white/40 mb-1">Monitoring Active</p>
            <p className="text-2xl font-bold text-black dark:text-white">214 Devices</p>
            <span className="inline-flex items-center gap-1 mt-2 text-xs bg-black/10 dark:bg-white/10 text-black dark:text-white px-2 py-0.5 rounded-full">
              <TrendingUp className="size-3" /> 97% Online
            </span>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="p-4">
            <p className="text-xs text-black/40 dark:text-white/40 mb-1">Critical Alerts</p>
            <p className="text-3xl font-bold text-red-500 dark:text-red-400">3</p>
            <p className="text-xs text-black/40 dark:text-white/40 mt-1">Active right now</p>
          </div>
          <div className="bg-black dark:bg-white px-4 py-2.5 rounded-b-2xl flex items-center justify-between">
            <p className="text-sm font-semibold text-white dark:text-black">View Alerts</p>
            <ArrowRight className="size-3.5 text-white dark:text-black" />
          </div>
        </div>

        {/* Geofence */}
        <div className="bg-black dark:bg-white rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs text-white/50 dark:text-black/50 mb-1">Geofence Events</p>
            <p className="text-2xl font-bold text-white dark:text-black">2</p>
            <p className="text-xs text-white/50 dark:text-black/50 mt-1">Boundary Breaches</p>
          </div>
          <div>
            <p className="text-xs text-white/50 dark:text-black/50 mb-1.5">94% Zone Compliance</p>
            <div className="w-full h-1.5 bg-white/20 dark:bg-black/20 rounded-full">
              <div className="h-1.5 bg-white/80 dark:bg-black/80 rounded-full" style={{ width: "94%" }} />
            </div>
          </div>
        </div>

        {/* Recent Alerts list */}
        <div className="col-span-1 sm:col-span-2 bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3">
          {recentAlerts.map((t, i) => (
            <div key={i}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-black/8 dark:bg-white/8 flex items-center justify-center">
                    <t.icon className={`size-3.5 ${t.iconClass}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">{t.label}</p>
                    <p className="text-xs text-black/40 dark:text-white/40">{t.sub}</p>
                  </div>
                </div>
                <p className={`text-xs font-medium ${badgeColor[t.badge]}`}>{t.badge}</p>
              </div>
              {i < recentAlerts.length - 1 && <div className="mt-3 border-t border-black/8 dark:border-white/8" />}
            </div>
          ))}
        </div>

        {/* Device Health */}
        <div className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs text-black/40 dark:text-white/40">Device Health</p>
          <p className="text-3xl font-bold text-black dark:text-white">92%</p>
          <p className="text-xs text-black/40 dark:text-white/40">17 need attention</p>
          <div className="flex flex-col gap-2 mt-auto pt-2">
            <button className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/8 dark:bg-white/8 text-black dark:text-white text-xs font-medium hover:opacity-80 transition-opacity">
              [VIEW DEVICES] <ArrowRight className="size-3" />
            </button>
            <button className="flex items-center justify-between px-3 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-medium hover:opacity-80 transition-opacity">
              [DIAGNOSTICS] <Settings className="size-3" />
            </button>
          </div>
        </div>

        {/* Proof of Life */}
        <div className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-1">
          <p className="text-xs text-black/40 dark:text-white/40">Proof of Life</p>
          <p className="text-3xl font-bold text-black dark:text-white">187</p>
          <p className="text-sm font-medium text-black dark:text-white">Verified</p>
          <p className="text-xs text-black/40 dark:text-white/40">4 pending · 2 mins ago</p>
        </div>

        {/* System Status */}
        <div className="bg-black dark:bg-white rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-xs text-white/50 dark:text-black/50">System Status</p>
            <div className="w-2 h-2 rounded-full bg-green-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white dark:text-black">Secure</p>
            <p className="text-2xl font-bold text-white dark:text-black">98.4%</p>
            <p className="text-xs text-white/50 dark:text-black/50">Uptime</p>
          </div>
        </div>

      </div>
    </div>
  );
}
