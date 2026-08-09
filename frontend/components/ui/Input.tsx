/* eslint-disable */
"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-text-secondary"
          >
            {label}
            {props.required && <span className="text-danger mr-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary",
            "placeholder:text-text-muted",
            "focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-secondary",
            "transition-all duration-150",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {helperText && !error && <p className="text-xs text-text-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
