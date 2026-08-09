/* eslint-disable */
"use client";

import { ThemeProvider } from "@/components/ThemeProvider";

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
