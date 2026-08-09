"use client";

import type { ExtractItem } from "@/types/boq";

interface Props {
  isArabic: boolean;
  rows: ExtractItem[];
  editable?: boolean;
  onUpdateRow?: (idx: number, field: keyof ExtractItem, value: number) => void;
}

export default function ExtractWorkItemsTable({
  isArabic,
  rows,
  editable = false,
  onUpdateRow,
}: Props) {
  const totalWork = rows.reduce((s, r) => s + r.workValue, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-primary text-white">
              <th className="p-2 border">#</th>
              <th className="p-2 border">{isArabic ? "كود" : "Code"}</th>
              <th className="p-2 border text-right">
                {isArabic ? "بيان" : "Description"}
              </th>
              <th className="p-2 border">{isArabic ? "وحدة" : "Unit"}</th>
              <th className="p-2 border">{isArabic ? "تعاقدي" : "Contract"}</th>
              <th className="p-2 border">{isArabic ? "سابق" : "Prev."}</th>
              <th className="p-2 border">{isArabic ? "حالي" : "Current"}</th>
              <th className="p-2 border">{isArabic ? "إجمالي" : "Total"}</th>
              <th className="p-2 border">%</th>
              <th className="p-2 border">{isArabic ? "منفذ" : "Executed"}</th>
              <th className="p-2 border">{isArabic ? "فئة" : "Price"}</th>
              <th className="p-2 border">{isArabic ? "قيمة" : "Value"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              // ✅ Key فريد: itemCode + idx
              const uniqueKey = `${r.itemCode}-${idx}`;

              return (
                <tr key={uniqueKey} className="border-t hover:bg-surface-secondary">
                  <td className="p-2 border text-center">{idx + 1}</td>
                  <td className="p-2 border font-mono text-xs">{r.itemCode}</td>
                  <td className="p-2 border">{r.description}</td>
                  <td className="p-2 border text-center">{r.unit}</td>
                  <td className="p-2 border text-center">
                    {r.contractQuantity}
                  </td>
                  <td className="p-2 border text-center bg-info-light font-medium">
                    {r.previous}
                  </td>
                  <td className="p-2 border text-center">
                    {editable && onUpdateRow ? (
                      <input
                        type="number"
                        value={r.current ?? ""}
                        onChange={(e) =>
                          onUpdateRow(idx, "current", Number(e.target.value))
                        }
                        className="w-20 border rounded p-1 text-center"
                      />
                    ) : (
                      r.current
                    )}
                  </td>
                  <td className="p-2 border text-center font-medium">
                    {r.total}
                  </td>
                  <td className="p-2 border text-center">
                    {editable && onUpdateRow ? (
                      <input
                        type="number"
                        value={r.executionPercent ?? ""}
                        onChange={(e) =>
                          onUpdateRow(
                            idx,
                            "executionPercent",
                            Number(e.target.value)
                          )
                        }
                        className="w-16 border rounded p-1 text-center"
                      />
                    ) : (
                      `${r.executionPercent}%`
                    )}
                  </td>
                  <td className="p-2 border text-center">
                    {r.executedQuantity.toFixed(2)}
                  </td>
                  <td className="p-2 border text-center">
                    {r.unitPrice.toLocaleString()}
                  </td>
                  <td className="p-2 border text-center font-bold text-gold">
                    {r.workValue.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-tertiary font-bold border-t-2">
              <td colSpan={11} className="p-2.5 border text-left">
                {isArabic ? "إجمالي قيمة الأعمال" : "Total Work Value"}
              </td>
              <td className="p-2.5 border text-center text-primary text-base">
                {totalWork.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
