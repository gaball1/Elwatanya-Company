/* eslint-disable */
"use client";

import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  return (
    <button
      suppressHydrationWarning
      onClick={toggle}
      className="p-2 rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
      aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
    >
      {resolved === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
