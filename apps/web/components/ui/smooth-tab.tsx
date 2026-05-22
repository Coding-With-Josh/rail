"use client";

import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  content?: React.ReactNode;
  color: string;
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? "30%" : "-30%", opacity: 0, filter: "blur(4px)" }),
  center: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: (direction: number) => ({ x: direction < 0 ? "30%" : "-30%", opacity: 0, filter: "blur(4px)" }),
};

const transition = { duration: 0.3, ease: [0.32, 0.72, 0, 1] };

interface SmoothTabProps {
  items: TabItem[];
  defaultTabId?: string;
  className?: string;
  onChange?: (tabId: string) => void;
}

export default function SmoothTab({ items, defaultTabId, className, onChange }: SmoothTabProps) {
  const [selected, setSelected] = React.useState<string>(defaultTabId ?? items[0].id);
  const [direction, setDirection] = React.useState(0);
  const [dimensions, setDimensions] = React.useState({ width: 0, left: 0 });

  const buttonRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const update = () => {
      const btn = buttonRefs.current.get(selected);
      const container = containerRef.current;
      if (btn && container) {
        const r = btn.getBoundingClientRect();
        const cr = container.getBoundingClientRect();
        setDimensions({ width: r.width, left: r.left - cr.left });
      }
    };
    requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [selected]);

  const handleTabClick = (tabId: string) => {
    const ci = items.findIndex((i) => i.id === selected);
    const ni = items.findIndex((i) => i.id === tabId);
    setDirection(ni > ci ? 1 : -1);
    setSelected(tabId);
    onChange?.(tabId);
  };

  const selectedItem = items.find((i) => i.id === selected);

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div
        aria-label="Tabs"
        className={cn(
          "relative flex items-center gap-1 py-1 -px-3 rounded-xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3",
          className
        )}
        ref={containerRef}
        role="tablist"
      >
        <motion.div
          animate={{ width: dimensions.width - 8, x: dimensions.left + 4, opacity: 1 }}
          className={cn("absolute z-1 rounded-lg", selectedItem?.color)}
          initial={false}
          style={{ height: "calc(100% - 8px)", top: "4px" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
        <div className="relative z-2 grid w-full gap-1" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
          {items.map((item) => {
            const isSelected = selected === item.id;
            return (
              <button
                aria-selected={isSelected}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 rounded-lg px-2 sm:px-3 py-2 font-medium text-sm transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected ? "text-white" : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                )}
                id={`tab-${item.id}`}
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                ref={(el) => { if (el) buttonRefs.current.set(item.id, el); else buttonRefs.current.delete(item.id); }}
                role="tab"
                tabIndex={isSelected ? 0 : -1}
                type="button"
              >
                {item.icon && <item.icon className="size-3.5 shrink-0" />}
                <span className="hidden sm:inline truncate">{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {selectedItem?.content && (
        <AnimatePresence custom={direction} initial={false} mode="wait">
          <motion.div
            animate="center"
            custom={direction}
            exit="exit"
            initial="enter"
            key={`content-${selected}`}
            transition={transition as any}
            variants={slideVariants as any}
          >
            {selectedItem.content}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
