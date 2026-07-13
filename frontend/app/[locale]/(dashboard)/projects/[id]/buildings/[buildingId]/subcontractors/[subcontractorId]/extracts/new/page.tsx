/* eslint-disable */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui";
import { Save, Plus, Trash2 } from "lucide-react";
import BackButton from "@/components/shared/BackButton";
import ExtractDeductionsTable from "@/components/boq/ExtractDeductionsTable";
import ExtractSummaryCards from "@/components/boq/ExtractSummaryCards";
import ExtractWorkItemsTable from "@/components/boq/ExtractWorkItemsTable";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import {
  calcExtractItem,
  getContractorBoq,
  validateExtractItems,
} from "@/lib/boqStore";
import { financeApi } from "@/lib/api/financeApi";
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

  const {
    previousPaid,
    previousQuantities,
    loading: metaLoading,
  } = useExtractMeta(buildingId, contractorId, runningNumber);

  // ✅ منع setRunningNumber من التحديث إذا كانت القيمة نفسها
  useEffect(() => {
    let mounted = true;

    financeApi
      .getExtractMeta(buildingId, contractorId, runningNumber)
      .then((m) => {
        if (!mounted) return;
        setMaxRunningNumber(m.nextRunningNumber - 1);
        setRunningNumber((prev) =>
          prev === m.nextRunningNumber ? prev : m.nextRunningNumber
        );
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [buildingId, contractorId]);

  // ✅ useMemo للـ boq عشان منع التغيير في كل ريندر
  const boq = useMemo(() => {
    return getContractorBoq(buildingId, contractorId);
  }, [buildingId, contractorId]);

  // ✅ State للـ rows
  const [rows, setRows] = useState<ExtractItem[]>([]);

  // ✅ useEffect الرئيسي - إدارة rows بطريقة صح
  useEffect(() => {
    if (metaLoading) return;
    if (!boq.length) return;

    setRows((prev) => {
      // ✅ أول تحميل فقط
      if (prev.length === 0) {
        return boq.map((b) =>
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

      // ✅ تحديث السابق مع الحفاظ على current اللي المستخدم كتبه
      return prev.map((old) => {
        const boqItem = boq.find((x) => x.itemCode === old.itemCode);

        return calcExtractItem({
          ...old,
          previous: previousQuantities[old.itemCode] || 0,
          contractQuantity: boqItem?.assignedQuantity || old.contractQuantity,
          unitPrice: boqItem?.unitPrice || old.unitPrice,
        });
      });
    });
  }, [metaLoading, previousQuantities, boq]);

  const updateRow = (idx: number, field: keyof ExtractItem, value: number) => {
    const next = [...rows];
    next[idx] = calcExtractItem({ ...next[idx], [field]: value });
    setRows(next);
  };

  // ✅ استخدام rows مباشرة في الحسابات
  const { totalWorkValue, deductions, totalDeductions, netPayable } =
    useExtractCalculations(
      rows,
      insurancePercent,
      manualDeductions,
      previousPaid,
      isArabic
    );

  // ✅ إضافة خصم جديد
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

  // ✅ تحديث خصم
  const handleUpdateDeduction = (
    idx: number,
    field: keyof ExtractDeduction,
    value: any
  ) => {
    const updated = [...manualDeductions];
    updated[idx] = { ...updated[idx], [field]: value };
    setManualDeductions(updated);
  };

  // ✅ حذف خصم
  const handleDeleteDeduction = (idx: number) => {
    setManualDeductions(manualDeductions.filter((_, i) => i !== idx));
    setDeleteDedIdx(null);
  };

  // ✅ دالة للتحقق من تكرار رقم الجاري
  const isRunningNumberDuplicate = useCallback(
    (number: number): boolean => {
      // جلب جميع مستخلصات المقاول من mockData
      const allExtracts = getContractorExtracts(buildingId, contractorId);
      return allExtracts.some(
        (extract: any) => extract.runningNumber === number
      );
    },
    [buildingId, contractorId]
  );

  // ✅ دالة لجلب مستخلصات المقاول (لو مش موجودة)
  const getContractorExtracts = useCallback(
    (buildingId: string, contractorId: string): any[] => {
      // جلب من mockData أو من الـ Store
      // هنستخدم mockSubcontractorStatements
      const { mockSubcontractorStatements } = require("@/lib/mockData");
      return mockSubcontractorStatements.filter(
        (s: any) =>
          s.buildingId === buildingId &&
          s.subcontractorId === contractorId &&
          s.status === "approved"
      );
    },
    []
  );

  // ✅ Validation لرقم الجاري (مع منع التكرار ومنع الكسر)
  const validateRunningNumber = (value: number): boolean => {
    // 1. ✅ التحقق من أن الرقم عدد صحيح (ليس كسر)
    if (!Number.isInteger(value)) {
      showToast(
        isArabic
          ? "رقم الجاري يجب أن يكون عدداً صحيحاً"
          : "Running number must be an integer",
        "error"
      );
      return false;
    }

    // 2. التحقق من أن الرقم أكبر من 0
    if (value < 1) {
      showToast(
        isArabic
          ? "رقم الجاري يجب أن يكون أكبر من 0"
          : "Running number must be greater than 0",
        "error"
      );
      return false;
    }

    // 3. التحقق من أن الرقم لا يزيد عن المسموح
    if (maxRunningNumber > 0 && value > maxRunningNumber + 1) {
      showToast(
        isArabic
          ? `رقم الجاري لا يمكن أن يزيد عن ${maxRunningNumber + 1}`
          : `Running number cannot exceed ${maxRunningNumber + 1}`,
        "error"
      );
      return false;
    }

    // 4. ✅ التحقق من عدم تكرار الرقم
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

    // ✅ منع إدخال أي شيء غير أرقام
    if (e.target.value && isNaN(value)) {
      showToast(
        isArabic ? "يرجى إدخال رقم صحيح" : "Please enter a valid number",
        "info"
      );
      return;
    }

    // ✅ التحقق من الصحة
    if (validateRunningNumber(value)) {
      setRunningNumber(value);
    }
  };

  const handleSave = async () => {
    // ✅ التحقق من صحة رقم الجاري (بما في ذلك التكرار)
    if (!validateRunningNumber(runningNumber)) {
      return;
    }

    const validation = validateExtractItems(buildingId, contractorId, rows);
    if (!validation.ok) {
      showToast(validation.error || "خطأ", "error");
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
      await financeApi.saveExtract(
        {
          id: Date.now().toString(),
          buildingId,
          projectId,
          contractorId,
          date,
          status,
          runningNumber: status === "running" ? runningNumber : undefined,
          label,
          insurancePercent,
          items: rows,
          deductions,
          totalWorkValue,
          previousPaid,
          totalDeductions,
          netPayable,
          signatures: [],
        },
        manualDeductions.filter((d) => d.type === "manual")
      );

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

  // ✅ عرض الخصومات مع إمكانية الإضافة والتعديل
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
          <label className="text-xs text-gray-500">
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
            <label className="text-xs text-gray-500">
              {isArabic ? "رقم الجاري" : "Running #"}
            </label>
            <input
              type="number"
              step="1" // ✅ منع الكسر (يسمح بالأعداد الصحيحة فقط)
              min="1"
              max={maxRunningNumber + 1}
              value={runningNumber}
              onChange={handleRunningNumberChange}
              className="w-full border-b outline-none font-medium"
            />
            {maxRunningNumber > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {isArabic
                  ? `آخر رقم جاري: ${maxRunningNumber}`
                  : `Last running #: ${maxRunningNumber}`}
              </p>
            )}
          </Card>
        )}
        <Card className="p-3">
          <label className="text-xs text-gray-500">
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
          <label className="text-xs text-gray-500">
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
        <Card className="p-3 bg-blue-50 border border-blue-200 text-sm">
          <span className="text-blue-800 font-medium">
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

      {/* ✅ قسم الخصومات مع زر الإضافة */}
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

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
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
                    <td colSpan={4} className="p-4 text-center text-gray-400">
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
                        className="border-t hover:bg-gray-50"
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
                              value={ded.percent || ""}
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
                        <td className="p-2 text-center font-bold text-red-500">
                          {ded.amount?.toLocaleString() || 0} ج.م
                        </td>
                        <td className="p-2 text-center">
                          {isManual ? (
                            <button
                              onClick={() => {
                                if (manualIdx !== -1)
                                  setDeleteDedIdx(manualIdx);
                              }}
                              className="text-red-500 hover:text-red-700 transition p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">
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
