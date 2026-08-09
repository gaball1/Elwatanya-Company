"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ExtractDeduction } from "@/types/finance";

interface Props {
  isArabic: boolean;
  deductions: ExtractDeduction[];
  onChange: (deductions: ExtractDeduction[]) => void;
  onDeleteConfirm: (index: number) => void;
  readOnly?: boolean;
}

export default function ExtractDeductionsTable({
  isArabic,
  deductions,
  onChange,
  onDeleteConfirm,
  readOnly = false,
}: Props) {
  const manualRows = deductions.filter((d) => d.type === "manual");
  const autoRows = deductions.filter((d) => d.type !== "manual");

  const updateManual = (idx: number, field: keyof ExtractDeduction, value: string | number) => {
    const realIdx = deductions.findIndex(
      (d, i) => d.type === "manual" && manualRows.indexOf(d) === idx
    );
    if (realIdx < 0) return;
    const next = [...deductions];
    next[realIdx] = { ...next[realIdx], [field]: value };
    onChange(next);
  };

  const addManual = () => {
    onChange([
      ...deductions,
      {
        id: `ded-${Date.now()}`,
        name: "",
        amount: 0,
        percent: 0,
        type: "manual",
      },
    ]);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      <div className="bg-danger-dark text-white px-4 py-2.5 font-bold text-sm">
        {isArabic ? "بيان الاستقطاعات" : "Deductions Statement"}
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-danger-light text-danger-dark">
            <th className="p-2 border text-right">
              {isArabic ? "البيان" : "Description"}
            </th>
            <th className="p-2 border text-center w-24">
              {isArabic ? "النسبة" : "%"}
            </th>
            <th className="p-2 border text-center w-36">
              {isArabic ? "المبلغ" : "Amount"}
            </th>
            <th className="p-2 border w-10"></th>
          </tr>
        </thead>
        <tbody>
          {autoRows.map((ded) => (
            <tr key={ded.id} className="border-t bg-surface-secondary">
              <td className="p-2 border font-medium text-text-primary">
                {ded.name}
                {ded.readOnly && (
                  <span className="ms-2 text-xs text-text-muted">
                    ({isArabic ? "تلقائي" : "auto"})
                  </span>
                )}
              </td>
              <td className="p-2 border text-center text-text-secondary">
                {ded.percent ? `${ded.percent}%` : "—"}
              </td>
              <td className="p-2 border text-center font-bold text-danger">
                {ded.amount.toLocaleString()}
              </td>
              <td className="p-2 border"></td>
            </tr>
          ))}
          {manualRows.map((ded, idx) => (
            <tr key={ded.id} className="border-t hover:bg-surface-secondary">
              <td className="p-2 border">
                {readOnly ? (
                  ded.name
                ) : (
                  <input
                    type="text"
                    value={ded.name}
                    onChange={(e) => updateManual(idx, "name", e.target.value)}
                    className="w-full p-1.5 border rounded text-sm"
                    placeholder={isArabic ? "اسم الخصم" : "Deduction name"}
                  />
                )}
              </td>
              <td className="p-2 border text-center">
                {readOnly ? (
                  ded.percent ? `${ded.percent}%` : "—"
                ) : (
                  <input
                    type="number"
                    value={ded.percent ?? ""}
                    onChange={(e) =>
                      updateManual(idx, "percent", Number(e.target.value))
                    }
                    className="w-full p-1.5 border rounded text-sm text-center"
                    placeholder="%"
                    step="any"
                  />
                )}
              </td>
              <td className="p-2 border text-center font-bold text-danger">
                {readOnly ? (
                  ded.amount.toLocaleString()
                ) : (
                  <input
                    type="number"
                    value={ded.amount ?? ""}
                    onChange={(e) =>
                      updateManual(idx, "amount", Number(e.target.value))
                    }
                    className="w-full p-1.5 border rounded text-sm text-center font-bold"
                    step="any"
                  />
                )}
              </td>
              <td className="p-2 border text-center">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onDeleteConfirm(idx)}
                    className="text-danger hover:text-danger-dark"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-danger-dark text-white font-bold">
            <td className="p-2.5 border" colSpan={2}>
              {isArabic ? "إجمالي الاستقطاعات" : "Total Deductions"}
            </td>
            <td className="p-2.5 border text-center">
              {deductions
                .reduce((s, d) => s + (d.amount || 0), 0)
                .toLocaleString()}
            </td>
            <td className="border"></td>
          </tr>
        </tfoot>
      </table>
      {!readOnly && (
        <div className="p-3 border-t bg-surface">
          <button
            type="button"
            onClick={addManual}
            className="flex items-center gap-1 text-sm text-gold hover:underline font-medium"
          >
            <Plus size={16} />
            {isArabic ? "إضافة خصم" : "Add Deduction"}
          </button>
        </div>
      )}
    </div>
  );
}
