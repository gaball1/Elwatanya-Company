"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { usePathname } from "next/navigation";

const CREEP_DURATION = 1.4;
const SAFETY_TIMEOUT_MS = 6000;

export default function PageProgress() {
  const pathname = usePathname();
  const controls = useAnimationControls();
  const prevPathname = useRef<string>(pathname);
  const safetyTimer = useRef<number | null>(null);

  const finishBar = useCallback(async () => {
    if (safetyTimer.current !== null) {
      window.clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    }
    await controls.start({
      width: "100%",
      opacity: 1,
      transition: { duration: 0.25, ease: "easeIn" },
    });
    await new Promise((resolve) => setTimeout(resolve, 180));
    await controls.start({ opacity: 0, transition: { duration: 0.3 } });
    await controls.start({ width: "0%", opacity: 0, transition: { duration: 0 } });
  }, [controls]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.hasAttribute("download")
      ) {
        return;
      }
      controls.start({
        width: "75%",
        opacity: 1,
        transition: { duration: CREEP_DURATION, ease: "easeOut" },
      });
      if (safetyTimer.current !== null) window.clearTimeout(safetyTimer.current);
      safetyTimer.current = window.setTimeout(() => {
        finishBar();
      }, SAFETY_TIMEOUT_MS);
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (safetyTimer.current !== null) window.clearTimeout(safetyTimer.current);
    };
  }, [controls, finishBar]);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;
    finishBar();
  }, [pathname, finishBar]);

  return (
    <motion.div
      initial={{ width: "0%", opacity: 0 }}
      animate={controls}
      className="fixed top-0 left-0 h-[3px] z-[110] bg-gradient-to-r from-primary via-primary to-gold shadow-[0_1px_4px_rgba(26,54,93,0.35)]"
      aria-hidden="true"
    />
  );
}
