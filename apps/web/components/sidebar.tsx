"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Overview", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 6.5L8 2l6 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg> },
  { href: "/dashboard/devices", label: "Devices", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
  { href: "/dashboard/alerts", label: "Alerts", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 014 4v3l1 2H3l1-2V6a4 4 0 014-4zM6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg> },
  { href: "/dashboard/map", label: "Live Map", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2C5.8 2 4 3.8 4 6c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg> },
  { href: "/dashboard/settings", label: "Settings", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
];

function Hamburger({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors" aria-label="Toggle sidebar">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    </button>
  );
}

export function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 256, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex-shrink-0 flex flex-col gap-6 p-4 overflow-hidden"
        >
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-md bg-black border border-muted-foreground dark:border-muted flex items-center justify-center text-xs font-bold text-white">R</div>
              <span className="text-sm font-medium text-black/60 dark:text-white/50 whitespace-nowrap">Rail</span>
            </div>
            <Hamburger onClick={onToggle} />
          </div>

          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => {
              const active = l.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(l.href);
              return (
                <a key={l.href} href={l.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                    active
                      ? "bg-black/15 dark:bg-white/15 text-black dark:text-white font-medium"
                      : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                  }`}>
                  {l.icon}{l.label}
                </a>
              );
            })}
          </nav>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export { Hamburger };
