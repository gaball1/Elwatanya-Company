"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Inbox } from "lucide-react";
import Button from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({ icon, title, description, action, secondaryAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center mb-4">
        {icon || <Inbox size={28} className="text-text-muted" />}
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-text-muted max-w-sm mb-6">{description}</p>}
      <div className="flex items-center gap-3">
        {action && <Button onClick={action.onClick}>{action.label}</Button>}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>
        )}
      </div>
    </div>
  );
}
