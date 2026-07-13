/* eslint-disable */
"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AddSubcontractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (subcontractor: any) => void;
  availableSubcontractors: any[];
  buildingId: string;
  isArabic: boolean;
}

export default function AddSubcontractorModal({
  isOpen,
  onClose,
  onAdd,
  availableSubcontractors,
  buildingId,
  isArabic,
}: AddSubcontractorModalProps) {
  const [form, setForm] = useState({
    subcontractorId: "",
    workType: "",
    agreedPrice: 0,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSub = availableSubcontractors.find(
      (s) => s.id === form.subcontractorId
    );
    if (selectedSub) {
      onAdd({
        id: Date.now().toString(),
        buildingId,
        subcontractorId: selectedSub.id,
        assignedDate: new Date().toISOString().split("T")[0],
        status: "active",
        workType: form.workType || selectedSub.workType,
        agreedPrice: form.agreedPrice,
      });
    }
    setForm({ subcontractorId: "", workType: "", agreedPrice: 0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "إضافة مقاول للمبنى" : "Add Subcontractor to Building"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isArabic ? "اختر المقاول" : "Select Subcontractor"} *
            </label>
            <select
              value={form.subcontractorId}
              onChange={(e) =>
                setForm({ ...form, subcontractorId: e.target.value })
              }
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold"
            >
              <option value="">
                {isArabic ? "-- اختر --" : "-- Select --"}
              </option>
              {availableSubcontractors.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} - {sub.workType}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isArabic ? "نوع العمل" : "Work Type"}
            </label>
            <input
              type="text"
              value={form.workType}
              onChange={(e) => setForm({ ...form, workType: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold"
              placeholder={isArabic ? "مثال: حداد" : "Example: Steel fixer"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isArabic ? "السعر المتفق عليه (ج.م)" : "Agreed Price (EGP)"}
            </label>
            <input
              type="number"
              value={form.agreedPrice}
              onChange={(e) =>
                setForm({ ...form, agreedPrice: Number(e.target.value) })
              }
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold"
              placeholder="0"
            />
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
              {isArabic ? "إضافة" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
