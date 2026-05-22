"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface FilterDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  alwaysInactive?: boolean;
}

export function FilterDropdown({ label, options, value, onChange, alwaysInactive }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = !alwaysInactive && value !== label;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm transition-colors border ${
          active
            ? "bg-black dark:bg-white text-white dark:text-black border-transparent"
            : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-black/8 dark:hover:bg-white/8"
        }`}
      >
        {value} <ChevronDown className="size-3.5" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 min-w-full bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden py-1.5 whitespace-nowrap">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="flex items-center justify-between w-full px-4 py-2 text-sm text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {opt}
              {value === opt && <Check className="size-3.5 text-black/50 dark:text-white/50" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
