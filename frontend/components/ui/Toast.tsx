/* eslint-disable */
"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: "bg-success-light dark:bg-success/10", border: "border-success/30", icon: "text-success", text: "text-text-primary" },
  error: { bg: "bg-danger-light dark:bg-danger/10", border: "border-danger/30", icon: "text-danger", text: "text-text-primary" },
  warning: { bg: "bg-warning-light dark:bg-warning/10", border: "border-warning/30", icon: "text-warning", text: "text-text-primary" },
  info: { bg: "bg-info-light dark:bg-info/10", border: "border-info/30", icon: "text-info", text: "text-text-primary" },
};

export function Toast({ message, type = "info", duration = 4000, onClose }: ToastProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const Icon = icons[type];
  const c = colors[type];

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-dropdown border backdrop-blur-sm",
        "animate-in slide-in-from-right-8 fade-in duration-300",
        c.bg, c.border
      )}
      role="alert"
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0", c.icon)} />
      <span className={cn("text-sm font-medium", c.text)}>{message}</span>
      <button onClick={onClose} className={cn("p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors", c.text)}>
        <X size={16} />
      </button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    setToast({ message, type });
  }, []);

  const handleClose = useCallback(() => {
    setToast(null);
  }, []);

  const ToastComponent = useMemo(() => {
    return toast ? (
      <Toast message={toast.message} type={toast.type} onClose={handleClose} />
    ) : null;
  }, [toast, handleClose]);

  return { showToast, ToastComponent };
}
