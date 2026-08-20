"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
            {label}
            {props.required && <span className="text-danger mr-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-text-primary",
            "border-border hover:border-border-dark",
            "focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/15 focus:shadow-[0_0_0_3px_rgba(201,160,61,0.08)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200 ease-out appearance-none",
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M5.5%207.5L10%2012l4.5-4.5%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat pr-10",
            error && "border-danger focus:border-danger focus:ring-danger/15 focus:shadow-[0_0_0_3px_rgba(220,38,38,0.08)]",
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
