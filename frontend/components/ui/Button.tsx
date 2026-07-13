/* eslint-disable */
"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", children, ...props },
    ref
  ) => {
    const variants = {
      primary:
        "bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-lg hover:scale-105",
      secondary:
        "bg-gold text-white hover:bg-gold-dark hover:shadow-lg hover:scale-105",
      outline:
        "border-2 border-primary text-primary bg-white hover:bg-primary hover:text-white hover:scale-105",
      ghost: "text-primary hover:bg-primary/10",
    };
    const sizes = {
      sm: "px-4 py-2 text-sm rounded-lg",
      md: "px-6 py-2.5 text-sm rounded-xl",
      lg: "px-8 py-3 text-base rounded-xl",
    };
    return (
      <button
        ref={ref}
        className={cn(
          variants[variant],
          sizes[size],
          "font-semibold transition-all duration-300 cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
