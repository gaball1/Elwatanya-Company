"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Download, Save, Upload } from "lucide-react";
import BackButton from "@/components/shared/BackButton";
import ExtractDeductionsTable from "@/components/boq/ExtractDeductionsTable";
import ExtractSummaryCards from "@/components/boq/ExtractSummaryCards";
import ExtractWorkItemsTable from "@/components/boq/ExtractWorkItemsTable";
import OtherAmountsEditor from "@/components/boq/OtherAmountsEditor";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import { calcExtractItem, toBoqExtractItem, fromBoqExtractItem } from "@/lib/extractCalculations";
import { exportExtractToExcel, parseExtractExcelFile } from "@/lib/boqExcel";
import { extractService, type OtherAmountItem } from "@/services/extract.service";
import { contractorBoqService, type ContractorBoqItem } from "@/services/contractorBoq.service";
import type { ContractorExtract, ExtractItem } from "@/types/boq";
import type { ExtractDeduction } from "@/types/finance";
import { useExtractCalculations } from "@/hooks/useExtractFinance";
import { useToast } from "@/components/ui/Toast";

export default function EditContractorExtractPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const contractorId = params.subcontractorId as string;
  const extractId = params.extractId as string;
  const base = `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${contractorId}/extracts`;
  const { showToast, ToastComponent } = useToast();

  const [initial, setInitial] = useState<ContractorExtract | null>(null);
  const [date, setDate] = useState("");
  const [insurancePercent, setInsurancePercent] = useState(5);
  const [rows, setRows] = useState<ExtractItem[]>([]);
  const [manualDeductions, setManualDeductions] = useState<ExtractDeduction[]>([]);
  const [previousPaid, setPreviousPaid] = useState(0);
  const [otherAmountItems, setOtherAmountItems] = useState<OtherAmountItem[]>([]);
  const [boqItems, setBoqItems] = useState<ContractorBoqItem[]>([]);
  const [deleteDedIdx, setDeleteDedIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const importExcelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      extractService.get(buildingId, contractorId, extractId),
      contractorBoqService.list(buildingId, contractorId),
    ]).then(([ex, boq]) => {
      setInitial(ex as unknown as ContractorExtract);
      setDate(ex.date);
      setInsurancePercent(ex.insurancePercent);
      setRows(ex.items.map((i) => toBoqExtractItem(i)));
      setManualDeductions(
        ex.deductions.filter((d) => d.type === "manual") as ExtractDeduction[]
      );
      setPreviousPaid(ex.previousPaid ?? 0);
      setOtherAmountItems(ex.otherAmountItems ?? []);
      setBoqItems(boq);
    });
  }, [buildingId, contractorId, extractId]);

  const updateRow = (idx: number, field: keyof ExtractItem, value: number) => {
    const next = [...rows];
    next[idx] = calcExtractItem({ ...next[idx], [field]: value });
    setRows(next);
  };

  const otherAmounts = otherAmountItems.reduce((s, i) => s + (i.amount || 0), 0);

  const { totalWorkValue, deductions, totalDeductions, netPayable } =
    useExtractCalculations(
      rows,
      insurancePercent,
      manualDeductions,
      otherAmounts,
      isArabic,
      previousPaid
    );

  if (!initial) {
    return (
      <div className="p-8 text-center text-text-secondary">
        {isArabic ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const imported = await parseExtractExcelFile(file);
      if (imported.length === 0) {
        showToast(
          isArabic ? "لا توجد بيانات صالحة في الملف" : "No valid rows in file",
          "error"
        );
        return;
      }
      let updated = 0;
      setRows((prev) => {
        const next = [...prev];
        for (const row of imported) {
          const existingIdx = row.itemCode
            ? next.findIndex((r) => r.itemCode === row.itemCode)
            : -1;
          if (existingIdx >= 0) {
            next[existingIdx] = calcExtractItem({
              ...next[existingIdx],
              previous: row.previous,
              current: row.current,
            });
            updated += 1;
          } else {
            const boq = boqItems.find((b) => b.itemCode === row.itemCode);
            next.push(
              calcExtractItem({
                itemCode: row.itemCode ?? "",
                description: row.description,
                unit: row.unit,
                contractQuantity: boq?.assignedQuantity ?? row.previous + row.current,
                previous: row.previous,
                current: row.current,
                executionPercent: 100,
                unitPrice: boq?.unitPrice ?? 0,
                contractorBoqItemId: boq?.id,
              })
            );
          }
        }
        return next;
      });
      showToast(
        isArabic
          ? `تم استيراد ${imported.length} بند من Excel (تحديث ${updated})`
          : `Imported ${imported.length} items from Excel (${updated} updated)`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast(isArabic ? "فشل استيراد ملف Excel" : "Excel import failed", "error");
    } finally {
      setImporting(false);
      if (importExcelRef.current) importExcelRef.current.value = "";
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportExtractToExcel({
        title: initial.label,
        subtitle: date,
        locale: isArabic ? "ar" : "en",
        items: rows.map((r) => ({
          itemCode: r.itemCode,
          description: r.description,
          unit: r.unit,
          previous: r.previous,
          current: r.current,
          total: r.total,
          executedQuantity: r.executedQuantity,
          workValue: r.workValue,
        })),
        otherAmountItems,
        deductions: deductions.map((d) => ({
          name: d.name,
          percentLabel:
            d.type === "manual" || d.percent == null ? "—" : `${d.percent}%`,
          amount: d.amount,
        })),
        totalWorkValue,
        otherAmounts,
        totalDeductions,
        netPayable,
      });
      showToast(isArabic ? "تم تصدير Excel" : "Excel exported", "success");
    } catch (err) {
      console.error(err);
      showToast(isArabic ? "فشل تصدير Excel" : "Excel export failed", "error");
    }
  };

  const handleSave = async () => {
    for (const item of rows) {
      const contract = boqItems.find((b) => b.itemCode === item.itemCode);
      if (!contract) continue;
      if (item.total > contract.assignedQuantity) {
        showToast(
          isArabic
            ? `الكمية المنفذة للبند ${item.itemCode} تتجاوز الكمية المسندة (${contract.assignedQuantity})`
            : `Executed quantity for item ${item.itemCode} exceeds assigned quantity (${contract.assignedQuantity})`,
          "error"
        );
        return;
      }
    }
    setSaving(true);
    try {
      const manualDeductionsPayload = manualDeductions
        .filter((d) => d.name.trim() !== "")
        .map((d) => ({
          id: d.id,
          name: d.name,
          amount: d.amount,
          type: "manual" as const,
        }));
      await extractService.update(buildingId, contractorId, extractId, {
        runningNumber: initial.runningNumber ?? 0,
        date,
        status: initial.status,
        insurancePercent,
        previousPaid,
        otherAmounts,
        otherAmountItems: otherAmountItems.filter((i) => i.name.trim() !== ""),
        items: rows.map((r) => fromBoqExtractItem(r)),
        manualDeductions: manualDeductionsPayload,
      });
      showToast(isArabic ? "تم التحديث" : "Updated", "success");
      router.push(`${base}/${extractId}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-light -m-6 space-y-4 pb-8">
      {ToastComponent}
      <div className="bg-surface border-b px-6 py-4 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <BackButton fallbackHref={`${base}/${extractId}`} />
          <h1 className="text-xl font-bold text-primary">
            {isArabic ? "تعديل المستخلص" : "Edit Extract"} — {initial.label}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={importExcelRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportExcel}
          />
          <button
            onClick={() => importExcelRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1 px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-surface-secondary text-sm disabled:opacity-50"
            title={isArabic ? "استيراد بنود من Excel" : "Import items from Excel"}
          >
            <Upload size={14} />
            {importing
              ? isArabic ? "جارٍ الاستيراد..." : "Importing..."
              : isArabic ? "استيراد Excel" : "Import Excel"}
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-4 py-2 border border-green-600 text-success-dark rounded-lg hover:bg-success-dark hover:text-white text-sm"
            title={isArabic ? "تصدير بنود إلى Excel" : "Export items to Excel"}
          >
            <Download size={14} />
            Excel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
          >
            <Save size={14} />
            {isArabic ? "حفظ" : "Save"}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-surface p-3 rounded-lg shadow-sm">
            <label className="text-xs text-text-secondary">
              {isArabic ? "التاريخ" : "Date"}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border-b outline-none font-medium"
            />
          </div>
          <div className="bg-surface p-3 rounded-lg shadow-sm">
            <label className="text-xs text-text-secondary">
              {isArabic ? "التأمين %" : "Insurance %"}
            </label>
            <input
              type="number"
              value={insurancePercent}
              onChange={(e) => setInsurancePercent(Number(e.target.value))}
              className="w-full border-b outline-none font-medium"
            />
          </div>
          <div className="bg-surface p-3 rounded-lg shadow-sm">
            <OtherAmountsEditor
              isArabic={isArabic}
              items={otherAmountItems}
              onChange={setOtherAmountItems}
            />
          </div>
        </div>

        <ExtractWorkItemsTable
          isArabic={isArabic}
          rows={rows}
          editable
          onUpdateRow={updateRow}
        />

        <ExtractDeductionsTable
          isArabic={isArabic}
          deductions={deductions}
          onChange={(d) =>
            setManualDeductions(d.filter((x) => x.type === "manual"))
          }
          onDeleteConfirm={setDeleteDedIdx}
        />

        <ExtractSummaryCards
          isArabic={isArabic}
          totalWorkValue={totalWorkValue}
          otherAmounts={otherAmounts}
          totalDeductions={totalDeductions}
          netPayable={netPayable}
        />
      </div>

      {deleteDedIdx !== null && (
        <DeleteConfirmModal
          isArabic={isArabic}
          message={isArabic ? "حذف هذا الخصم؟" : "Delete?"}
          onCancel={() => setDeleteDedIdx(null)}
          onConfirm={() => {
            const manual = manualDeductions.filter((d) => d.type === "manual");
            const target = manual[deleteDedIdx];
            if (target) {
              setManualDeductions(
                manualDeductions.filter((d) => d.id !== target.id)
              );
            }
            setDeleteDedIdx(null);
          }}
        />
      )}
    </div>
  );
}
