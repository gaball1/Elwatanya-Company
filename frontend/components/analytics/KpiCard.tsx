/* eslint-disable */
"use client";

import { Card } from "@/components/ui";
import { Info } from "lucide-react";
import { formatUnitValue, type NumberUnit } from "@/lib/format";

interface KpiCardData {
  key: string;
  label: string;
  labelAr?: string;
  description?: string;
  descriptionAr?: string;
  value: number;
  unit: string;
  status?: string;
}

const statusColors: Record<string, string> = {
  good: "border-l-success bg-success/5",
  warning: "border-l-warning bg-warning/5",
  critical: "border-l-danger bg-danger/5",
  danger: "border-l-danger bg-danger/5",
  neutral: "border-l-border bg-surface/50",
};

interface KpiCardProps {
  kpi: KpiCardData;
  isArabic?: boolean;
  onClick?: () => void;
}

export default function KpiCard({ kpi, isArabic = false, onClick }: KpiCardProps) {
  const label = isArabic ? kpi.labelAr || kpi.label : kpi.label;
  const description = isArabic ? kpi.descriptionAr || kpi.description : kpi.description;
  const { text, unit } = formatUnitValue(kpi.value, kpi.unit, isArabic ? "ar" : "en-US");
  const color = (kpi.status && statusColors[kpi.status]) || "border-l-border bg-surface/50";

  return (
    <Card
      className={`p-4 border-l-4 cursor-pointer hover:shadow-md transition-all ${color}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-text-secondary mb-1 leading-snug">{label}</p>
        {description && (
          <span
            className="text-text-muted shrink-0 cursor-help"
            title={description}
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-primary">{text}</span>
        {unit && <span className="text-xs text-text-secondary">{unit}</span>}
      </div>
      {description && (
        <p className="text-[10px] text-text-muted mt-1 line-clamp-2">{description}</p>
      )}
    </Card>
  );
}
