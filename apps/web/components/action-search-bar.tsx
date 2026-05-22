"use client";

import { BarChart2, LayoutGrid, MapPin, Bell, Settings, Search, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/use-debounce";

interface Action {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  short?: string;
  end?: string;
  href?: string;
}

const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0, height: 0 },
    show: { opacity: 1, height: "auto", transition: { height: { duration: 0.3 }, staggerChildren: 0.05 } },
    exit: { opacity: 0, height: 0, transition: { height: { duration: 0.2 }, opacity: { duration: 0.15 } } },
  },
  item: {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -5, transition: { duration: 0.15 } },
  },
} as const;

const defaultActions: Action[] = [
  { id: "1", label: "Overview", icon: <LayoutGrid className="h-4 w-4 text-blue-500" />, end: "Page", href: "/dashboard" },
  { id: "2", label: "Devices", icon: <BarChart2 className="h-4 w-4 text-orange-500" />, end: "Page", href: "/dashboard/devices" },
  { id: "3", label: "Live Map", icon: <MapPin className="h-4 w-4 text-green-500" />, end: "Page", href: "/dashboard/map" },
  { id: "4", label: "Alerts", icon: <Bell className="h-4 w-4 text-red-500" />, end: "Page", href: "/dashboard/alerts" },
  { id: "5", label: "Settings", icon: <Settings className="h-4 w-4 text-gray-400" />, end: "Page", href: "/dashboard/settings" },
];

export function ActionSearchBar({ actions = defaultActions }: { actions?: Action[] }) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 150);

  const filtered = useMemo(() => {
    if (!debouncedQuery) return actions;
    const q = debouncedQuery.toLowerCase();
    return actions.filter((a) => `${a.label} ${a.description ?? ""}`.toLowerCase().includes(q));
  }, [debouncedQuery, actions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((p) => (p < filtered.length - 1 ? p + 1 : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((p) => (p > 0 ? p - 1 : filtered.length - 1)); }
    else if (e.key === "Enter" && activeIndex >= 0) {
      const href = filtered[activeIndex]?.href;
      if (href) window.location.href = href;
    }
  }, [filtered, activeIndex]);

  return (
    <div className="w-full">
      <div className="relative">
        <Input
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="Search commands…"
          className="h-10 pr-9 pl-3 text-sm"
        />
        <div className="absolute top-1/2 right-3 -translate-y-1/2">
          <AnimatePresence mode="popLayout">
            {query.length > 0 ? (
              <motion.div key="send" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Send className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            ) : (
              <motion.div key="search" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Search className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isFocused && (
          <motion.ul
            variants={ANIMATION_VARIANTS.container}
            initial="hidden" animate="show" exit="exit"
            className="mt-2 overflow-hidden rounded-lg border border-border bg-background"
          >
            {filtered.map((action, i) => (
              <motion.li
                key={action.id}
                variants={ANIMATION_VARIANTS.item}
                onClick={() => action.href && (window.location.href = action.href)}
                className={`flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-muted ${activeIndex === i ? "bg-muted" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {action.icon}
                  <span className="font-medium text-foreground">{action.label}</span>
                  {action.description && <span className="text-xs text-muted-foreground">{action.description}</span>}
                </div>
                {action.end && <span className="text-xs text-muted-foreground">{action.end}</span>}
              </motion.li>
            ))}
            <div className="border-t border-border px-3 py-2 flex justify-between text-xs text-muted-foreground">
              <span>↑↓ navigate</span>
              <span>ESC close</span>
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
