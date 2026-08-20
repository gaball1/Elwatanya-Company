"use client";

import { Trash2, Download, X, CheckSquare } from "lucide-react";
import { useParams } from "next/navigation";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  onBulkExport?: () => void;
  entityLabel?: { ar: string; en: string };
}

export default function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkExport,
  entityLabel = { ar: "عنصر", en: "items" },
}: BulkActionsBarProps) {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4">
      <button onClick={onDeselectAll} className="p-1 text-text-muted hover:text-text-primary transition">
        <X size={18} />
      </button>
      <div className="flex items-center gap-2 text-sm">
        <CheckSquare size={16} className="text-primary" />
        <span className="text-text-primary font-medium">{selectedCount}</span>
        <span className="text-text-secondary">
          {isArabic ? `من ${totalCount} ${entityLabel.ar}` : `of ${totalCount} ${entityLabel.en}`}
        </span>
      </div>
      <div className="h-5 w-px bg-border" />
      <button
        onClick={onSelectAll}
        className="text-xs text-primary hover:underline"
      >
        {isArabic ? "تحديد الكل" : "Select All"}
      </button>
      {onBulkExport && (
        <button
          onClick={onBulkExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-success-dark/30 text-success-dark rounded-lg hover:bg-success-dark/5 transition"
        >
          <Download size={14} />
          {isArabic ? "تصدير" : "Export"}
        </button>
      )}
      <button
        onClick={onBulkDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition"
      >
        <Trash2 size={14} />
        {isArabic ? "حذف" : "Delete"}
      </button>
    </div>
  );
}
