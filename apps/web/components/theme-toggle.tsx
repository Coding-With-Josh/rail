"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [resolvedTheme, setTheme]);

  return null;
}
