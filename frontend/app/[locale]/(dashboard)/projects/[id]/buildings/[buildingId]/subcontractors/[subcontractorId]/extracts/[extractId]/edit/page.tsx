/* eslint-disable */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import BackButton from "@/components/shared/BackButton";
import ExtractDeductionsTable from "@/components/boq/ExtractDeductionsTable";
import ExtractSummaryCards from "@/components/boq/ExtractSummaryCards";
import ExtractWorkItemsTable from "@/components/boq/ExtractWorkItemsTable";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import { calcExtractItem, toBoqExtractItem, fromBoqExtractItem } from "@/lib/extractCalculations";
import { extractService } from "@/services/extract.service";
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
  const [boqItems, setBoqItems] = useState<ContractorBoqItem[]>([]);
  const [deleteDedIdx, setDeleteDedIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

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
      setBoqItems(boq);
    });
  }, [buildingId, contractorId, extractId]);

  const updateRow = (idx: number, field: keyof ExtractItem, value: number) => {
    const next = [...rows];
    next[idx] = calcExtractItem({ ...next[idx], [field]: value });
    setRows(next);
  };

  const { totalWorkValue, deductions, totalDeductions, netPayable } =
    useExtractCalculations(
      rows,
      insurancePercent,
      manualDeductions,
      previousPaid,
      isArabic
    );

  if (!initial) {
    return (
      <div className="p-8 text-center text-text-secondary">
        {isArabic ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

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
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
        >
          <Save size={14} />
          {isArabic ? "حفظ" : "Save"}
        </button>
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
