"use client";

import { Download, Printer } from "lucide-react";
import BackButton from "@/components/shared/BackButton";

interface BoqPageHeaderProps {
  title: string;
  subtitle?: string;
  fallbackHref: string;
  isArabic: boolean;
  onPrint: () => void;
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
    <div className="bg-white border-b px-6 py-4 -mx-0 -mt-2 mb-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <BackButton fallbackHref={fallbackHref} />
          <div>
            <h1 className="text-2xl font-bold text-primary">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition text-sm"
          >
            <Download size={18} />
            {isArabic ? "تصدير Excel" : "Export Excel"}
          </button>
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm"
          >
            <Printer size={18} />
            {isArabic ? "طباعة PDF" : "Print PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
