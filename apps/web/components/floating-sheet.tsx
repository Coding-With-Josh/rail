"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface FloatingSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function FloatingSheet({ open, onClose, title, children }: FloatingSheetProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed top-4 right-4 bottom-4 w-[520px] z-40 flex flex-col bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/8 dark:border-white/8">
            <p className="text-sm font-semibold text-black dark:text-white">{title}</p>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-black/40 dark:text-white/40 hover:bg-black/8 dark:hover:bg-white/8 transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
