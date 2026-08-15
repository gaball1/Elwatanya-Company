"use client";

import { Plus, Trash2 } from "lucide-react";
import type { OtherAmountItem } from "@/services/extract.service";

interface Props {
  isArabic: boolean;
  items: OtherAmountItem[];
  onChange: (items: OtherAmountItem[]) => void;
  readOnly?: boolean;
}

function newItem(): OtherAmountItem {
  return { id: `other-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: "", amount: 0 };
}

export default function OtherAmountsEditor({ isArabic, items, onChange, readOnly = false }: Props) {
  const total = items.reduce((s, i) => s + (i.amount || 0), 0);

  const add = () => onChange([...items, newItem()]);
  const update = (idx: number, field: keyof OtherAmountItem, value: string | number) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    onChange(next);
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-text-secondary">
            {isArabic
              ? "أخرى — بنود إضافية تُضاف إلى قيمة الأعمال قبل الخصومات"
              : "Other — named items added to the work value before deductions"}
          </label>
          <button
            type="button"
            onClick={add}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gold text-white rounded-lg hover:bg-gold/80 transition"
          >
            <Plus size={16} />
            {isArabic ? "إضافة بند" : "Add Item"}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-text-muted border border-dashed border-border rounded-lg p-3">
          {isArabic ? "لا توجد بنود إضافية" : "No additional items"}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="p-2 text-right">
                  {isArabic ? "البيان" : "Description"}
                </th>
                <th className="p-2 text-center w-40">
                  {isArabic ? "المبلغ (ج.م)" : "Amount (EGP)"}
                </th>
                {!readOnly && <th className="p-2 text-center w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="border-t hover:bg-surface-secondary">
                  <td className="p-2">
                    {readOnly ? (
                      item.name
                    ) : (
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => update(idx, "name", e.target.value)}
                        className="w-full border-b outline-none focus:border-gold"
                        placeholder={isArabic ? "اسم البند (مثال: علاوة غلاء)" : "Item name"}
                      />
                    )}
                  </td>
                  <td className="p-2">
                    {readOnly ? (
                      <span className="block text-center font-medium">
                        {item.amount.toLocaleString()}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.amount === 0 ? "" : item.amount}
                        onChange={(e) =>
                          update(idx, "amount", Math.max(0, Number(e.target.value)))
                        }
                        placeholder="0"
                        className="w-full border-b outline-none focus:border-gold text-center"
                      />
                    )}
                  </td>
                  {!readOnly && (
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="text-danger hover:text-danger-dark transition p-1"
                        title={isArabic ? "حذف البند" : "Remove item"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50 border-t">
                <td className="p-2.5 font-bold text-emerald-700">
                  {isArabic ? "إجمالي أخرى" : "Other Total"}
                </td>
                <td className="p-2.5 text-center font-bold text-emerald-700">
                  {total.toLocaleString()} ج.م
                </td>
                {!readOnly && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
