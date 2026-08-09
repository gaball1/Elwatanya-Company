/* eslint-disable */
"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";

interface CreateStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (statement: any) => void;
  buildingSubs: any[];
  buildingId: string;
  isArabic: boolean;
}

export default function CreateStatementModal({
  isOpen,
  onClose,
  onAdd,
  buildingSubs,
  buildingId,
  isArabic,
}: CreateStatementModalProps) {
  const [form, setForm] = useState({
    subcontractorId: "",
    date: new Date().toISOString().split("T")[0],
    items: [{ itemName: "", quantity: 0, unitPrice: 0, total: 0 }],
    deductions: [{ name: "", amount: 0 }],
  });

  if (!isOpen) return null;

  const updateItem = (idx: number, field: string, val: any) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: val };
    if (field === "quantity" || field === "unitPrice") {
      newItems[idx].total =
        (newItems[idx].quantity || 0) * (newItems[idx].unitPrice || 0);
    }
    setForm({ ...form, items: newItems });
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        { itemName: "", quantity: 0, unitPrice: 0, total: 0 },
      ],
    });
  };

  const removeItem = (idx: number) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== idx),
    });
  };

  const addDeduction = () => {
    setForm({
      ...form,
      deductions: [...form.deductions, { name: "خصم", amount: 0 }],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalItems = form.items.reduce((s, i) => s + i.total, 0);
    const totalDeductions = form.deductions.reduce((s, d) => s + d.amount, 0);

    onAdd({
      id: Date.now().toString(),
      buildingId,
      subcontractorId: form.subcontractorId,
      statementNumber: `ST-${Date.now()}`,
      date: form.date,
      items: form.items,
      deductions: form.deductions,
      totalAmount: totalItems,
      deductionTotal: totalDeductions,
      netAmount: totalItems - totalDeductions,
      status: "pending",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "إنشاء مستخلص جديد" : "Create New Statement"}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {isArabic ? "اختر المقاول" : "Select Subcontractor"} *
            </label>
            <select
              value={form.subcontractorId}
              onChange={(e) =>
                setForm({ ...form, subcontractorId: e.target.value })
              }
              required
              className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold"
            >
              <option value="">
                {isArabic ? "-- اختر --" : "-- Select --"}
              </option>
              {buildingSubs.map((bs) => (
                <option key={bs.id} value={bs.subcontractorId}>
                  {bs.subcontractorName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {isArabic ? "التاريخ" : "Date"}
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-text-primary">
                {isArabic ? "البنود" : "Items"}
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-gold text-sm hover:underline"
              >
                + {isArabic ? "إضافة بند" : "Add Item"}
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder={isArabic ? "اسم البند" : "Item name"}
                    value={item.itemName}
                    onChange={(e) =>
                      updateItem(idx, "itemName", e.target.value)
                    }
                    className="flex-1 p-2 border border-border rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder={isArabic ? "الكمية" : "Qty"}
                    value={item.quantity ?? ""}
                    onChange={(e) =>
                      updateItem(idx, "quantity", Number(e.target.value))
                    }
                    className="w-20 p-2 border border-border rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder={isArabic ? "السعر" : "Price"}
                    value={item.unitPrice ?? ""}
                    onChange={(e) =>
                      updateItem(idx, "unitPrice", Number(e.target.value))
                    }
                    className="w-24 p-2 border border-border rounded-lg text-sm"
                  />
                  <span className="text-sm font-medium w-24">
                    {item.total.toLocaleString()} ج.م
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-danger p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-text-primary">
                {isArabic ? "الخصومات" : "Deductions"}
              </label>
              <button
                type="button"
                onClick={addDeduction}
                className="text-gold text-sm hover:underline"
              >
                + {isArabic ? "إضافة خصم" : "Add Deduction"}
              </button>
            </div>
            <div className="space-y-2">
              {form.deductions.map((deduction, idx) => (
                <input
                  key={idx}
                  type="number"
                  placeholder={isArabic ? "قيمة الخصم" : "Amount"}
                  value={deduction.amount}
                  onChange={(e) => {
                    const newDeductions = [...form.deductions];
                    newDeductions[idx].amount = Number(e.target.value);
                    setForm({ ...form, deductions: newDeductions });
                  }}
                  className="w-full p-2 border border-border rounded-lg"
                />
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between mb-1">
              <span>{isArabic ? "إجمالي البنود" : "Total Items"}:</span>
              <span className="font-bold">
                {form.items.reduce((s, i) => s + i.total, 0).toLocaleString()}{" "}
                ج.م
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span>{isArabic ? "الخصومات" : "Deductions"}:</span>
              <span className="text-danger">
                {form.deductions
                  .reduce((s, d) => s + d.amount, 0)
                  .toLocaleString()}{" "}
                ج.م
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-bold">{isArabic ? "الصافي" : "Net"}:</span>
              <span className="font-bold text-gold">
                {(
                  form.items.reduce((s, i) => s + i.total, 0) -
                  form.deductions.reduce((s, d) => s + d.amount, 0)
                ).toLocaleString()}{" "}
                ج.م
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark"
            >
              {isArabic ? "إنشاء" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
