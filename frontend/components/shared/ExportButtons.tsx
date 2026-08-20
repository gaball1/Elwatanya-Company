/* eslint-disable */
"use client";

import { useCallback, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { printAsPDF } from "@/lib/printUtils";
import { useToast } from "@/components/ui/Toast";

export interface ExportColumn {
  key: string;
  labelAr: string;
  labelEn: string;
  format?: (value: any, row: any) => string | number;
}

interface ExportButtonsProps {
  data: any[];
  columns: ExportColumn[];
  titleAr: string;
  titleEn: string;
  filename: string;
  locale?: string;
}

export default function ExportButtons({ data, columns, titleAr, titleEn, filename, locale = "ar" }: ExportButtonsProps) {
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const handlePdf = useCallback(async () => {
    if (!data.length) {
      showToast(isArabic ? "لا توجد بيانات للتصدير" : "No data to export", "error");
      return;
    }
    setExportingPdf(true);
    try {
      const headers = columns.map((c) => isArabic ? c.labelAr : c.labelEn);
      const rows = data.map((row) =>
        columns.map((c) => (c.format ? c.format(row[c.key], row) : row[c.key] ?? "—"))
      );
      await printAsPDF(rows, headers, isArabic ? titleAr : titleEn, isArabic);
      showToast(isArabic ? "تم تصدير PDF بنجاح" : "PDF exported successfully", "success");
    } catch {
      showToast(isArabic ? "فشل تصدير PDF" : "PDF export failed", "error");
    } finally {
      setExportingPdf(false);
    }
  }, [data, columns, titleAr, titleEn, isArabic, showToast]);

  const handleExcel = useCallback(() => {
    if (!data.length) {
      showToast(isArabic ? "لا توجد بيانات للتصدير" : "No data to export", "error");
      return;
    }
    setExportingExcel(true);
    try {
      const headers = columns.map((c) => isArabic ? c.labelAr : c.labelEn);
      const rows = data.map((row) =>
        columns.map((c) => (c.format ? c.format(row[c.key], row) : row[c.key] ?? ""))
      );
      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
    } catch {
      showToast(isArabic ? "فشل التصدير" : "Export failed", "error");
    } finally {
      setExportingExcel(false);
    }
  }, [data, columns, filename, isArabic, showToast]);

  return (
    <>
      {ToastComponent}
      <button
        onClick={handlePdf}
        disabled={exportingPdf || !data.length}
        className="flex items-center gap-2 px-3 py-2 border border-primary/30 text-primary rounded-lg hover:bg-primary/5 transition text-sm disabled:opacity-50"
      >
        {exportingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
        {isArabic ? "PDF" : "PDF"}
      </button>
      <button
        onClick={handleExcel}
        disabled={exportingExcel || !data.length}
        className="flex items-center gap-2 px-3 py-2 border border-success-dark/30 text-success-dark rounded-lg hover:bg-success-dark/5 transition text-sm disabled:opacity-50"
      >
        {exportingExcel ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {isArabic ? "Excel" : "Excel"}
      </button>
    </>
  );
}
