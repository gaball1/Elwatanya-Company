"use client";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "gold";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-surface-secondary text-text-secondary border-border",
  success: "bg-success-light text-success-dark border-success/30 dark:bg-success/10 dark:text-success",
  warning: "bg-warning-light text-warning-dark border-warning/30 dark:bg-warning/10 dark:text-warning",
  danger: "bg-danger-light text-danger-dark border-danger/30 dark:bg-danger/10 dark:text-danger",
  info: "bg-info-light text-info-dark border-info/30 dark:bg-info/10 dark:text-info",
  gold: "bg-gold-50 text-gold-700 border-gold/30 dark:bg-gold/10 dark:text-gold",
};

export default function Badge({ variant = "default", children, className, size = "md" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
