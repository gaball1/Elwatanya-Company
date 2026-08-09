/* eslint-disable */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { Save, Plus, Trash2 } from "lucide-react";
import BackButton from "@/components/shared/BackButton";
import ExtractDeductionsTable from "@/components/boq/ExtractDeductionsTable";
import ExtractSummaryCards from "@/components/boq/ExtractSummaryCards";
import ExtractWorkItemsTable from "@/components/boq/ExtractWorkItemsTable";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import { calcExtractItem, fromBoqExtractItem } from "@/lib/extractCalculations";
import { extractService, type Extract } from "@/services/extract.service";
import { contractorBoqService, type ContractorBoqItem } from "@/services/contractorBoq.service";
import type { ExtractItem } from "@/types/boq";
import type { ExtractDeduction } from "@/types/finance";
import {
  useExtractCalculations,
  useExtractMeta,
} from "@/hooks/useExtractFinance";
import { useToast } from "@/components/ui/Toast";

export default function NewContractorExtractPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const contractorId = params.subcontractorId as string;
  const { showToast, ToastComponent } = useToast();

  const [status, setStatus] = useState<"running" | "final">("running");
  const [runningNumber, setRunningNumber] = useState(1);
  const [insurancePercent, setInsurancePercent] = useState(5);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualDeductions, setManualDeductions] = useState<ExtractDeduction[]>(
    []
  );
  const [deleteDedIdx, setDeleteDedIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [maxRunningNumber, setMaxRunningNumber] = useState(0);
  const [rows, setRows] = useState<ExtractItem[]>([]);
  const [boqItems, setBoqItems] = useState<ContractorBoqItem[]>([]);
  const [extracts, setExtracts] = useState<Extract[]>([]);

  const {
    previousPaid,
    previousQuantities,
    loading: metaLoading,
  } = useExtractMeta(buildingId, contractorId, runningNumber);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      extractService.getMeta(buildingId, contractorId),
      contractorBoqService.list(buildingId, contractorId),
      extractService.list(buildingId, contractorId),
    ]).then(([meta, boq, existingExtracts]) => {
      if (!mounted) return;
      setMaxRunningNumber(meta.nextRunning - 1);
      setRunningNumber((prev) =>
        prev === meta.nextRunning ? prev : meta.nextRunning
      );
      setBoqItems(boq);
      setExtracts(existingExtracts);
    }).catch((err) => console.error("[ExtractNew] Failed to load initial data:", err));
    return () => { mounted = false; };
  }, [buildingId, contractorId]);

  useEffect(() => {
    if (metaLoading) return;
    if (!boqItems.length) return;

    setRows((prev) => {
      if (prev.length === 0) {
        return boqItems.map((b) =>
          calcExtractItem({
            itemCode: b.itemCode,
            description: b.description,
            unit: b.unit,
            contractQuantity: b.assignedQuantity || 0,
            previous: previousQuantities[b.itemCode] || 0,
            current: 0,
            executionPercent: 100,
            unitPrice: b.unitPrice || 0,
          })
        );
      }
      return prev.map((old) => {
        const boqItem = boqItems.find((x) => x.itemCode === old.itemCode);
        return calcExtractItem({
          ...old,
          previous: previousQuantities[old.itemCode] || 0,
          contractQuantity: boqItem?.assignedQuantity || old.contractQuantity,
          unitPrice: boqItem?.unitPrice || old.unitPrice,
        });
      });
    });
  }, [metaLoading, previousQuantities, boqItems]);

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

  const handleAddDeduction = () => {
    const newDeduction: ExtractDeduction = {
      id: `ded-${Date.now()}`,
      name: isArabic ? "خصم جديد" : "New Deduction",
      amount: 0,
      percent: 0,
      type: "manual",
    };
    setManualDeductions([...manualDeductions, newDeduction]);
  };

  const handleUpdateDeduction = (
    idx: number,
    field: keyof ExtractDeduction,
    value: any
  ) => {
    const updated = [...manualDeductions];
    updated[idx] = { ...updated[idx], [field]: value };
    setManualDeductions(updated);
  };

  const handleDeleteDeduction = (idx: number) => {
    setManualDeductions(manualDeductions.filter((_, i) => i !== idx));
    setDeleteDedIdx(null);
  };

  const isRunningNumberDuplicate = (number: number): boolean => {
    return extracts.some(
      (e) => e.runningNumber === number
    );
  };

  const validateRunningNumber = (value: number): boolean => {
    if (!Number.isInteger(value)) {
      showToast(
        isArabic
          ? "رقم الجاري يجب أن يكون عدداً صحيحاً"
          : "Running number must be an integer",
        "error"
      );
      return false;
    }
    if (value < 1) {
      showToast(
        isArabic
          ? "رقم الجاري يجب أن يكون أكبر من 0"
          : "Running number must be greater than 0",
        "error"
      );
      return false;
    }
    if (maxRunningNumber > 0 && value > maxRunningNumber + 1) {
      showToast(
        isArabic
          ? `رقم الجاري لا يمكن أن يزيد عن ${maxRunningNumber + 1}`
          : `Running number cannot exceed ${maxRunningNumber + 1}`,
        "error"
      );
      return false;
    }
    if (isRunningNumberDuplicate(value)) {
      showToast(
        isArabic
          ? `رقم الجاري ${value} موجود بالفعل لهذا المقاول`
          : `Running number ${value} already exists for this contractor`,
        "error"
      );
      return false;
    }
    return true;
  };

  const handleRunningNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(e.target.value);
    if (e.target.value && isNaN(value)) {
      showToast(
        isArabic ? "يرجى إدخال رقم صحيح" : "Please enter a valid number",
        "info"
      );
      return;
    }
    if (validateRunningNumber(value)) {
      setRunningNumber(value);
    }
  };

  const validations = useCallback(() => {
    const errors: string[] = [];

    if (!rows.length || rows.every((r) => r.current === 0)) {
      errors.push(isArabic ? "يجب إدخال بنود منفذة على الأقل" : "At least one item with executed quantity is required");
    }

    for (const item of rows) {
      if (item.current < 0) {
        errors.push(isArabic ? `الكمية المنفذة للبند ${item.itemCode} لا يمكن أن تكون سالبة` : `Executed quantity for item ${item.itemCode} cannot be negative`);
      }
      const contract = boqItems.find((b) => b.itemCode === item.itemCode);
      if (!contract) continue;
      if (item.total > contract.assignedQuantity) {
        errors.push(isArabic ? `الكمية المنفذة للبند ${item.itemCode} تتجاوز الكمية المسندة (${contract.assignedQuantity})` : `Executed quantity for item ${item.itemCode} exceeds assigned quantity (${contract.assignedQuantity})`);
      }
    }

    if (!date) {
      errors.push(isArabic ? "التاريخ مطلوب" : "Date is required");
    }

    for (const ded of deductions) {
      if (ded.amount < 0) {
        errors.push(isArabic ? "الاستقطاعات لا يمكن أن تكون سالبة" : "Deductions cannot be negative");
      }
    }

    if (insurancePercent < 0 || insurancePercent > 100) {
      errors.push(isArabic ? "نسبة التأمين يجب أن تكون بين 0 و 100" : "Insurance percent must be between 0 and 100");
    }

    return errors;
  }, [rows, boqItems, date, deductions, insurancePercent, isArabic]);

  const handleSave = async () => {
    if (!validateRunningNumber(runningNumber)) return;

    const validationErrors = validations();
    if (validationErrors.length > 0) {
      validationErrors.forEach((msg) => showToast(msg, "error"));
      return;
    }

    const label =
      status === "final"
        ? isArabic
          ? "أول وختامي"
          : "Final"
        : isArabic
        ? `جاري ${runningNumber}`
        : `Running ${runningNumber}`;

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
      await extractService.create(buildingId, contractorId, {
        runningNumber,
        date,
        status,
        insurancePercent,
        previousPaid,
        items: rows.map((r) => fromBoqExtractItem(r)),
        manualDeductions: manualDeductionsPayload,
      });
      showToast(isArabic ? "تم حفظ المستخلص" : "Extract saved", "success");
      router.push(
        `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${contractorId}/extracts`
      );
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : isArabic ? "فشل الحفظ" : "Save failed",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const base = `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${contractorId}/extracts`;

  const displayDeductions = [
    ...deductions.filter((d) => d.type !== "manual"),
    ...manualDeductions,
  ];

  return (
    <div className="space-y-4 pb-8">
      {ToastComponent}

      <div className="flex items-center gap-4 flex-wrap">
        <BackButton fallbackHref={base} />
        <h3 className="font-bold text-primary text-lg">
          {isArabic ? "مستخلص جديد" : "New Extract"}
        </h3>
        <button
          onClick={handleSave}
          disabled={saving || metaLoading}
          className="ms-auto flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
        >
          <Save size={14} />
          {saving
            ? isArabic
              ? "جاري الحفظ..."
              : "Saving..."
            : isArabic
            ? "حفظ"
            : "Save"}
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Card className="p-3">
          <label className="text-xs text-text-secondary">
            {isArabic ? "الحالة" : "Status"}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "running" | "final")}
            className="w-full border-b outline-none font-medium"
          >
            <option value="running">{isArabic ? "جاري" : "Running"}</option>
            <option value="final">{isArabic ? "أول وختامي" : "Final"}</option>
          </select>
        </Card>
        {status === "running" && (
          <Card className="p-3">
            <label className="text-xs text-text-secondary">
              {isArabic ? "رقم الجاري" : "Running #"}
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max={maxRunningNumber + 1}
              value={runningNumber}
              onChange={handleRunningNumberChange}
              className="w-full border-b outline-none font-medium"
            />
            {maxRunningNumber > 0 && (
              <p className="text-xs text-text-muted mt-1">
                {isArabic
                  ? `آخر رقم جاري: ${maxRunningNumber}`
                  : `Last running #: ${maxRunningNumber}`}
              </p>
            )}
          </Card>
        )}
        <Card className="p-3">
          <label className="text-xs text-text-secondary">
            {isArabic ? "التأمين %" : "Insurance %"}
          </label>
          <input
            type="number"
            value={insurancePercent}
            onChange={(e) => setInsurancePercent(Number(e.target.value))}
            className="w-full border-b outline-none font-medium"
            min={0}
            max={100}
          />
        </Card>
        <Card className="p-3">
          <label className="text-xs text-text-secondary">
            {isArabic ? "التاريخ" : "Date"}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border-b outline-none font-medium"
          />
        </Card>
      </div>

      {previousPaid > 0 && (
        <Card className="p-3 bg-info-light border border-blue-200 text-sm">
          <span className="text-info-dark font-medium">
            {isArabic
              ? "ماسبق صرفة (من المستخلصات السابقة):"
              : "Previously paid:"}{" "}
            <strong>{previousPaid.toLocaleString()} ج.م</strong>
          </span>
        </Card>
      )}

      <ExtractWorkItemsTable
        isArabic={isArabic}
        rows={rows}
        editable
        onUpdateRow={updateRow}
      />

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-primary">
            {isArabic ? "الاستقطاعات" : "Deductions"}
          </h4>
          <button
            onClick={handleAddDeduction}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gold text-white rounded-lg hover:bg-gold/80 transition"
          >
            <Plus size={16} />
            {isArabic ? "إضافة خصم" : "Add Deduction"}
          </button>
        </div>

        <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="p-2 text-right">
                    {isArabic ? "البيان" : "Description"}
                  </th>
                  <th className="p-2 text-center">
                    {isArabic ? "النسبة %" : "Percent %"}
                  </th>
                  <th className="p-2 text-center">
                    {isArabic ? "المبلغ" : "Amount"}
                  </th>
                  <th className="p-2 text-center">
                    {isArabic ? "إجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayDeductions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-text-muted">
                      {isArabic ? "لا توجد استقطاعات" : "No deductions"}
                    </td>
                  </tr>
                ) : (
                  displayDeductions.map((ded, idx) => {
                    const isManual = ded.type === "manual";
                    const manualIdx = isManual
                      ? manualDeductions.findIndex((d) => d.id === ded.id)
                      : -1;

                    return (
                      <tr
                        key={ded.id || idx}
                        className="border-t hover:bg-surface-secondary"
                      >
                        <td className="p-2">
                          {isManual ? (
                            <input
                              type="text"
                              value={ded.name}
                              onChange={(e) => {
                                if (manualIdx !== -1) {
                                  handleUpdateDeduction(
                                    manualIdx,
                                    "name",
                                    e.target.value
                                  );
                                }
                              }}
                              className="w-full border-b outline-none focus:border-gold"
                              placeholder={
                                isArabic ? "اسم الخصم" : "Deduction name"
                              }
                            />
                          ) : (
                            <span className="font-medium">{ded.name}</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {isManual ? (
                            <input
                              type="number"
                              value={ded.percent ?? ""}
                              onChange={(e) => {
                                if (manualIdx !== -1) {
                                  handleUpdateDeduction(
                                    manualIdx,
                                    "percent",
                                    Number(e.target.value)
                                  );
                                }
                              }}
                              className="w-16 border-b outline-none focus:border-gold text-center"
                              min={0}
                              max={100}
                            />
                          ) : (
                            <span>{ded.percent || 0}%</span>
                          )}
                        </td>
                        <td className="p-2 text-center font-bold text-danger">
                          {ded.amount?.toLocaleString() || 0} ج.م
                        </td>
                        <td className="p-2 text-center">
                          {isManual ? (
                            <button
                              onClick={() => {
                                if (manualIdx !== -1)
                                  setDeleteDedIdx(manualIdx);
                              }}
                              className="text-danger hover:text-danger-dark transition p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <span className="text-xs text-text-muted">
                              {isArabic ? "تلقائي" : "Auto"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ExtractSummaryCards
        isArabic={isArabic}
        totalWorkValue={totalWorkValue}
        totalDeductions={totalDeductions}
        netPayable={netPayable}
      />

      {deleteDedIdx !== null && (
        <DeleteConfirmModal
          isArabic={isArabic}
          message={isArabic ? "حذف هذا الخصم؟" : "Delete this deduction?"}
          onCancel={() => setDeleteDedIdx(null)}
          onConfirm={() => handleDeleteDeduction(deleteDedIdx)}
        />
      )}
    </div>
  );
}
