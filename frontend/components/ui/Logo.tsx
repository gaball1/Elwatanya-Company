/* eslint-disable */
"use client";

import { motion } from "framer-motion";
import { Building2 } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { container: "w-8 h-8", icon: 18, text: "text-sm" },
  md: { container: "w-10 h-10", icon: 22, text: "text-base" },
  lg: { container: "w-16 h-16", icon: 32, text: "text-xl" },
  xl: { container: "w-28 h-28", icon: 56, text: "text-2xl" },
};

export default function Logo({
  size = "md",
  animated = true,
  showText = true,
  className = "",
}: LogoProps) {
  const s = sizes[size];
  const isArabic =
    typeof window !== "undefined"
      ? document.documentElement.lang === "ar"
      : true;

  const logoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* الأيقونة المتحركة */}
      <motion.div
        className={`${s.container} bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg`}
        whileHover={animated ? { scale: 1.05, rotate: 5 } : {}}
        animate={
          animated
            ? {
                y: [0, -5, 0],
              }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          animate={
            animated
              ? {
                  scale: [1, 1.1, 1],
                }
              : {}
          }
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Building2 className={`text-white`} size={s.icon} />
        </motion.div>
      </motion.div>

      {/* النصوص */}
      {showText && (
        <div className="flex flex-col">
          <motion.span
            className={`font-black text-primary ${s.text} leading-tight`}
            initial={animated ? { opacity: 0, x: -10 } : {}}
            animate={animated ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            {isArabic ? "الوطنية" : "El Wataniya"}
          </motion.span>
          <motion.span
            className={`text-xs text-gold leading-tight`}
            initial={animated ? { opacity: 0, x: -10 } : {}}
            animate={animated ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {isArabic ? "للتنمية العمرانية" : "Urban Development"}
          </motion.span>
          <motion.span
            className={`text-[10px] text-gray-400 leading-tight`}
            initial={animated ? { opacity: 0, x: -10 } : {}}
            animate={animated ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            EST. 1998
          </motion.span>
        </div>
      )}
    </div>
  );

  return logoContent;
}
