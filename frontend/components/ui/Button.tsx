/* eslint-disable */
"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants = {
  primary: "bg-primary text-text-inverse hover:bg-primary-dark active:bg-primary-700 shadow-sm",
  secondary: "bg-gold text-white hover:bg-gold-dark active:bg-gold-700 shadow-sm",
  outline: "border-2 border-border text-text-primary bg-surface hover:bg-surface-secondary active:bg-surface-tertiary",
  ghost: "text-text-secondary hover:bg-surface-secondary active:bg-surface-tertiary",
  danger: "bg-danger text-white hover:bg-danger-dark active:bg-red-700 shadow-sm",
  success: "bg-success text-white hover:bg-success-dark active:bg-green-700 shadow-sm",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          variants[variant],
          sizes[size],
          "inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer",
          "focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
          "hover:scale-[1.02] active:scale-[0.98]",
          className
        )}
        {...props}
      >
        {loading ? <Loader2 size={size === "sm" ? 14 : 18} className="animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
