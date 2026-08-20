"use client";

import { Download } from "lucide-react";
import BackButton from "@/components/shared/BackButton";
import PrintPdfButton from "@/components/shared/PrintPdfButton";

interface BoqPageHeaderProps {
  title: string;
  subtitle?: string;
  fallbackHref: string;
  isArabic: boolean;
  onPrint: (logoUrl?: string) => Promise<void> | void;
  onExport: () => void;
}

export default function BoqPageHeader({
  title,
  subtitle,
  fallbackHref,
  isArabic,
  onPrint,
  onExport,
}: BoqPageHeaderProps) {
  return (
    <div className="bg-surface border-b px-6 py-4 -mx-0 -mt-2 mb-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <BackButton fallbackHref={fallbackHref} />
          <div>
            <h1 className="text-2xl font-bold text-primary">{title}</h1>
            {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-text-inverse transition text-sm"
          >
            <Download size={18} />
            {isArabic ? "تصدير Excel" : "Export Excel"}
          </button>
          <PrintPdfButton
            label={isArabic ? "طباعة PDF" : "Print PDF"}
            onPrint={onPrint}
          />
        </div>
      </div>
    </div>
  );
}
