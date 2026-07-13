/* eslint-disable */
"use client";
import React from "react";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Layers,
  Users,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import BoqPageHeader from "@/components/boq/BoqPageHeader";
import SignaturesSection from "@/components/boq/SignaturesSection";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { exportToCsv, printHtml } from "@/lib/documentUtils";
import {
  getDocSignatures,
  getEmployerItems,
  getFinalItems,
  importFinalFromEmployer,
  removeFinalItem,
  setDocSignatures,
  updateFinalItem,
  analyzeFinalItem,
  distributeComponent,
  updateFinalItemQuantity,
  updateComponentOnly,
  calculateFinalTotals,
  getContractorsForItemStore,
} from "@/lib/boqStore";
import type { FinalBoqItem, FinalBoqComponent } from "@/types/boq";
import {
  mockSubcontractors,
  mockProjects,
  mockBuildings,
} from "@/lib/mockData";

// ============================================
// ✅ مودال تحليل البند
// ============================================
function AnalyzeItemModal({
  isOpen,
  onClose,
  item,
  onAnalyze,
  isArabic,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: FinalBoqItem;
  onAnalyze: (
    components: { name: string; unit: string; unitPrice: number }[]
  ) => void;
  isArabic: boolean;
}) {
  const [components, setComponents] = useState([
    { name: "", unit: "م³", unitPrice: 0 },
  ]);

  const addComponent = () => {
    setComponents([...components, { name: "", unit: "م³", unitPrice: 0 }]);
  };

  const removeComponent = (idx: number) => {
    if (components.length === 1) return;
    setComponents(components.filter((_, i) => i !== idx));
  };

  const updateComponent = (idx: number, field: string, value: any) => {
    const updated = [...components];
    updated[idx] = { ...updated[idx], [field]: value };
    setComponents(updated);
  };

  const handleSubmit = () => {
    const validComponents = components.filter(
      (c) => c.name.trim() && c.unitPrice > 0
    );
    if (validComponents.length === 0) {
      return;
    }
    onAnalyze(validComponents);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "تحليل البند" : "Analyze Item"}: {item.itemCode}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              {isArabic ? "البند:" : "Item:"}{" "}
              <span className="font-bold">{item.description}</span>
            </p>
            <p className="text-sm text-gray-600">
              {isArabic ? "الكمية:" : "Quantity:"}{" "}
              <span className="font-bold">
                {item.quantity} {item.unit}
              </span>
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              ⚠️{" "}
              {isArabic
                ? "الكمية ثابتة لكل المكونات وتساوي كمية البند الأصلي"
                : "Quantity is fixed for all components and equals the original item quantity"}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-primary">
              {isArabic ? "المكونات" : "Components"}
            </h3>
            {components.map((comp, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={comp.name}
                  onChange={(e) => updateComponent(idx, "name", e.target.value)}
                  className="flex-1 p-2 border rounded-lg text-sm"
                  placeholder={isArabic ? "اسم المكون" : "Component name"}
                />
                <select
                  value={comp.unit}
                  onChange={(e) => updateComponent(idx, "unit", e.target.value)}
                  className="w-20 p-2 border rounded-lg text-sm"
                >
                  <option value="م³">م³</option>
                  <option value="م²">م²</option>
                  <option value="عدد">عدد</option>
                  <option value="طوبة">طوبة</option>
                  <option value="كجم">كجم</option>
                </select>
                <input
                  type="number"
                  value={comp.unitPrice || ""}
                  onChange={(e) =>
                    updateComponent(idx, "unitPrice", Number(e.target.value))
                  }
                  className="w-28 p-2 border rounded-lg text-sm"
                  placeholder={isArabic ? "السعر" : "Price"}
                  min={0}
                />
                <span className="text-xs text-gray-400 w-16 text-center">
                  {item.quantity} {item.unit}
                </span>
                <button
                  onClick={() => removeComponent(idx)}
                  className="text-red-500 hover:text-red-700 p-1"
                  disabled={components.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addComponent}
            className="flex items-center gap-1 text-gold hover:underline text-sm"
          >
            <Plus size={16} /> {isArabic ? "إضافة مكون" : "Add Component"}
          </button>

          <div className="flex gap-3 pt-3 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold/80"
            >
              {isArabic ? "تحليل" : "Analyze"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ✅ مودال توزيع المكون
// ============================================
function DistributeComponentModal({
  isOpen,
  onClose,
  item,
  component,
  onDistribute,
  isArabic,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: FinalBoqItem | null;
  component: FinalBoqComponent | null;
  onDistribute: (
    distribution: { contractorId: string; quantity: number }[]
  ) => void;
  isArabic: boolean;
}) {
  if (!isOpen || !component || !item) {
    return null;
  }

  const [distribution, setDistribution] = useState([
    { contractorId: "", quantity: 0 },
  ]);

  const totalDistributed = distribution.reduce((sum, d) => sum + d.quantity, 0);
  const remaining = component.quantity - totalDistributed;

  const addRow = () => {
    setDistribution([...distribution, { contractorId: "", quantity: 0 }]);
  };

  const removeRow = (idx: number) => {
    if (distribution.length === 1) return;
    setDistribution(distribution.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: string, value: any) => {
    const updated = [...distribution];
    updated[idx] = { ...updated[idx], [field]: value };
    setDistribution(updated);
  };

  const handleSubmit = () => {
    const validDistribution = distribution.filter(
      (d) => d.contractorId && d.quantity > 0
    );
    const total = validDistribution.reduce((sum, d) => sum + d.quantity, 0);
    if (total !== component.quantity) {
      return;
    }
    onDistribute(validDistribution);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "توزيع المكون" : "Distribute Component"}:{" "}
            {component.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              {isArabic ? "المكون:" : "Component:"}{" "}
              <span className="font-bold">{component.name}</span>
            </p>
            <p className="text-sm text-gray-600">
              {isArabic ? "الكمية الكلية:" : "Total Quantity:"}{" "}
              <span className="font-bold">
                {component.quantity} {component.unit}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              {isArabic ? "السعر:" : "Price:"}{" "}
              <span className="font-bold">{component.unitPrice} ج.م</span>
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-primary">
              {isArabic
                ? "التوزيع على المقاولين"
                : "Distribution to Contractors"}
            </h3>
            {distribution.map((dist, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={dist.contractorId}
                  onChange={(e) =>
                    updateRow(idx, "contractorId", e.target.value)
                  }
                  className="flex-1 p-2 border rounded-lg text-sm"
                >
                  <option value="">
                    {isArabic ? "اختر المقاول" : "Select contractor"}
                  </option>
                  {mockSubcontractors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={dist.quantity || ""}
                  onChange={(e) =>
                    updateRow(idx, "quantity", Number(e.target.value))
                  }
                  className="w-32 p-2 border rounded-lg text-sm"
                  placeholder={isArabic ? "الكمية" : "Qty"}
                  min={0}
                  max={component.quantity}
                />
                <span className="text-xs text-gray-400 w-16 text-center">
                  {dist.quantity && component.quantity
                    ? ((dist.quantity / component.quantity) * 100).toFixed(1)
                    : 0}
                  %
                </span>
                <button
                  onClick={() => removeRow(idx)}
                  className="text-red-500 hover:text-red-700 p-1"
                  disabled={distribution.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className="flex items-center gap-1 text-gold hover:underline text-sm"
          >
            <Plus size={16} /> {isArabic ? "إضافة مقاول" : "Add Contractor"}
          </button>

          <div
            className={`p-3 rounded-lg ${
              remaining === 0 ? "bg-green-50" : "bg-yellow-50"
            }`}
          >
            <p className="text-sm">
              {isArabic ? "المتبقي للتوزيع:" : "Remaining for distribution:"}{" "}
              <span
                className={`font-bold ${
                  remaining === 0 ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {remaining} {component.unit}
              </span>
            </p>
          </div>

          <div className="flex gap-3 pt-3 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={remaining !== 0}
              className={`flex-1 px-4 py-2 rounded-lg text-white ${
                remaining === 0
                  ? "bg-gold hover:bg-gold/80"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {isArabic ? "توزيع" : "Distribute"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ✅ مودال تعديل البند
// ============================================
function EditItemModal({
  isOpen,
  onClose,
  item,
  onSave,
  isArabic,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: FinalBoqItem | null;
  onSave: (quantity: number, unitPrice: number) => void;
  isArabic: boolean;
}) {
  if (!isOpen || !item) {
    return null;
  }

  const [quantity, setQuantity] = useState(item.quantity);
  const [unitPrice, setUnitPrice] = useState(item.unitPrice);

  const handleSubmit = () => {
    if (quantity <= 0 || unitPrice < 0) {
      return;
    }
    onSave(quantity, unitPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "تعديل البند" : "Edit Item"}: {item.itemCode}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isArabic ? "الكمية" : "Quantity"} ({item.unit})
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
              min={0}
              step="any"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isArabic ? "السعر" : "Unit Price"} (ج.م)
            </label>
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
              min={0}
              step="any"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              {isArabic ? "القيمة الإجمالية:" : "Total Value:"}{" "}
              <span className="font-bold text-gold">
                {(quantity * unitPrice).toLocaleString()} ج.م
              </span>
            </p>
            {item.isAnalyzed && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️{" "}
                {isArabic
                  ? "تغيير الكمية سيؤثر على جميع المكونات بنفس النسبة"
                  : "Changing quantity will affect all components proportionally"}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold/80"
            >
              {isArabic ? "حفظ" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ✅ مودال تعديل المكون
// ============================================
function EditComponentModal({
  isOpen,
  onClose,
  item,
  component,
  onSave,
  isArabic,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: FinalBoqItem | null;
  component: FinalBoqComponent | null;
  onSave: (newPrice: number) => void;
  isArabic: boolean;
}) {
  if (!isOpen || !item || !component) {
    return null;
  }

  const [unitPrice, setUnitPrice] = useState(component.unitPrice);

  const handleSubmit = () => {
    if (unitPrice < 0) return;
    onSave(unitPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "تعديل المكون" : "Edit Component"}: {component.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              {isArabic ? "المكون:" : "Component:"}{" "}
              <span className="font-bold">{component.name}</span>
            </p>
            <p className="text-sm text-gray-600">
              {isArabic ? "الكمية:" : "Quantity:"}{" "}
              <span className="font-bold">
                {component.quantity} {component.unit}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              {isArabic ? "السعر الحالي:" : "Current Price:"}{" "}
              <span className="font-bold">{component.unitPrice} ج.م</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isArabic ? "السعر الجديد" : "New Price"} (ج.م)
            </label>
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
              min={0}
              step="any"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              {isArabic ? "القيمة الجديدة:" : "New Value:"}{" "}
              <span className="font-bold text-gold">
                {(component.quantity * unitPrice).toLocaleString()} ج.م
              </span>
            </p>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold/80"
            >
              {isArabic ? "حفظ" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ✅ مكون عرض المكونات الفرعية (بنفس شكل الجدول الرئيسي)
// ============================================
function ComponentsSubTable({
  components,
  item,
  onDistribute,
  onEditComponent,
  isArabic,
}: {
  components: FinalBoqComponent[];
  item: FinalBoqItem;
  onDistribute: (component: FinalBoqComponent) => void;
  onEditComponent: (component: FinalBoqComponent) => void;
  isArabic: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  if (components.length === 0) return null;

  return (
    <tr>
      <td colSpan={11} className="p-0">
        <div className="bg-gray-50/50 border-t">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 px-4 py-1 text-xs text-gray-500 hover:text-primary"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {isArabic ? "المكونات" : "Components"} ({components.length})
          </button>
          {expanded && (
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-center">#</th>
                  <th className="p-2 text-right">
                    {isArabic ? "المكون" : "Component"}
                  </th>
                  <th className="p-2 text-center">
                    {isArabic ? "الوحدة" : "Unit"}
                  </th>
                  <th className="p-2 text-center">
                    {isArabic ? "الكمية" : "Qty"}
                  </th>
                  <th className="p-2 text-center">
                    {isArabic ? "المتبقي" : "Remaining"}
                  </th>
                  <th className="p-2 text-center">
                    {isArabic ? "السعر" : "Price"}
                  </th>
                  <th className="p-2 text-center">
                    {isArabic ? "القيمة" : "Value"}
                  </th>
                  <th className="p-2 text-center">
                    {isArabic ? "المقاولين" : "Contractors"}
                  </th>
                  <th className="p-2 text-center">
                    {isArabic ? "الحالة" : "Status"}
                  </th>
                  <th className="p-2 text-center">
                    {isArabic ? "إجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {components.map((comp, idx) => {
                  // ✅ جمع أسماء المقاولين للمكون
                  const compContractors =
                    comp.distribution.length > 0
                      ? comp.distribution
                          .map((d) => `${d.contractorName} (${d.quantity})`)
                          .join(", ")
                      : isArabic
                      ? "غير موزع"
                      : "Not distributed";

                  return (
                    <tr key={comp.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 text-center">{idx + 1}</td>
                      <td className="p-2">{comp.name}</td>
                      <td className="p-2 text-center">{comp.unit}</td>
                      <td className="p-2 text-center">{comp.quantity}</td>
                      <td className="p-2 text-center font-bold text-gold">
                        {comp.remainingQuantity}
                      </td>
                      <td className="p-2 text-center">
                        {comp.unitPrice.toLocaleString()}
                      </td>
                      <td className="p-2 text-center font-bold text-gold">
                        {comp.totalValue.toLocaleString()}
                      </td>
                      <td className="p-2 text-center text-xs">
                        {compContractors}
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            comp.isDistributed
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {comp.isDistributed
                            ? isArabic
                              ? "موزع"
                              : "Distributed"
                            : isArabic
                            ? "قيد التوزيع"
                            : "Pending"}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex justify-center gap-1">
                          {!comp.isDistributed && (
                            <button
                              onClick={() => {
                                if (comp) {
                                  onDistribute(comp);
                                }
                              }}
                              className="text-gold hover:underline text-xs flex items-center gap-1"
                            >
                              <Users size={14} />
                              {isArabic ? "توزيع" : "Distribute"}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onEditComponent(comp);
                            }}
                            className="text-blue-500 hover:text-blue-700 text-xs p-1"
                            title={isArabic ? "تعديل السعر" : "Edit Price"}
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  );
}

// ============================================
// ✅ الصفحة الرئيسية
// ============================================
export default function FinalBoqPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const docKey = `final:${buildingId}`;
  const back = `/${locale}/projects/${projectId}/buildings/${buildingId}/estimates`;
  const { showToast, ToastComponent } = useToast();
  const [, refresh] = useState(0);

  // ✅ منع Hydration Error
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const employerItems = getEmployerItems(buildingId);
  const items = getFinalItems(buildingId);
  const [sigs, setSigs] = useState(getDocSignatures(docKey));
  const [editItem, setEditItem] = useState<FinalBoqItem | null>(null);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FinalBoqItem | null>(null);
  const [selectedComponent, setSelectedComponent] =
    useState<FinalBoqComponent | null>(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showEditComponentModal, setShowEditComponentModal] = useState(false);
  const [editingComponent, setEditingComponent] =
    useState<FinalBoqComponent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const bump = () => refresh((n) => n + 1);

  // ✅ فلترة البنود حسب البحث
  const filteredItems = items.filter(
    (item) =>
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContractorsForItem = (item: FinalBoqItem): string => {
    // البنود العادية
    if (!item.isAnalyzed || item.components.length === 0) {
      const contractors = getContractorsForItemStore(buildingId, item.itemCode);

      if (contractors.length === 0) {
        return isArabic ? "غير موزع" : "Not distributed";
      }

      return contractors
        .map((c) => `${c.contractorName} (${c.quantity})`)
        .join(", ");
    }

    // البنود المحللة
    const contractorMap = new Map<string, number>();

    item.components.forEach((comp) => {
      comp.distribution.forEach((d) => {
        contractorMap.set(
          d.contractorName,
          (contractorMap.get(d.contractorName) || 0) + d.quantity
        );
      });
    });

    if (contractorMap.size === 0) {
      return isArabic ? "غير موزع" : "Not distributed";
    }

    return [...contractorMap.entries()]
      .map(([name, qty]) => `${name} (${qty})`)
      .join(", ");
  };
  const handleAnalyze = (
    components: { name: string; unit: string; unitPrice: number }[]
  ) => {
    if (selectedItem) {
      const result = analyzeFinalItem(
        buildingId,
        selectedItem.itemCode,
        components
      );
      if (result) {
        showToast(
          isArabic ? "تم تحليل البند بنجاح" : "Item analyzed successfully",
          "success"
        );
        bump();
        setShowAnalyzeModal(false);
        setSelectedItem(null);
      }
    }
  };

  const handleDistribute = (
    distribution: { contractorId: string; quantity: number }[]
  ) => {
    if (selectedItem && selectedComponent) {
      const result = distributeComponent(
        buildingId,
        selectedItem.itemCode,
        selectedComponent.id,
        distribution
      );
      if (result.ok) {
        showToast(
          isArabic
            ? "تم توزيع المكون بنجاح"
            : "Component distributed successfully",
          "success"
        );
        bump();
        setShowDistributeModal(false);
        setSelectedComponent(null);
        setSelectedItem(null);
      } else {
        showToast(result.error || "خطأ", "error");
      }
    }
  };

  const handleEditItemSave = (quantity: number, unitPrice: number) => {
    if (editItem) {
      const result = updateFinalItemQuantity(
        buildingId,
        editItem.itemCode,
        quantity,
        unitPrice
      );
      if (result) {
        showToast(
          isArabic ? "تم تعديل البند بنجاح" : "Item updated successfully",
          "success"
        );
        bump();
        setEditItem(null);
        setShowEditItemModal(false);
      } else {
        showToast(
          isArabic
            ? "لا يمكن تقليل الكمية عن الكمية الموزعة على المقاولين"
            : "Cannot reduce quantity below allocated to contractors",
          "error"
        );
      }
    }
  };

  const handleEditComponentSave = (newPrice: number) => {
    if (selectedItem && editingComponent) {
      const result = updateComponentOnly(
        buildingId,
        selectedItem.itemCode,
        editingComponent.id,
        newPrice
      );
      if (result) {
        showToast(
          isArabic ? "تم تعديل المكون بنجاح" : "Component updated successfully",
          "success"
        );
        bump();
        setShowEditComponentModal(false);
        setEditingComponent(null);
        setSelectedItem(null);
      } else {
        showToast(
          isArabic ? "فشل تعديل المكون" : "Failed to update component",
          "error"
        );
      }
    }
  };

  // ✅ لو مش mounted، ارجع loading
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-light -m-6 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">
          {isArabic ? "جاري التحميل..." : "Loading..."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-light -m-6" suppressHydrationWarning>
      {ToastComponent}
      <BoqPageHeader
        title={isArabic ? "المقايسة النهائية" : "Final BOQ"}
        fallbackHref={back}
        isArabic={isArabic}
        onExport={() =>
          exportToCsv(
            "final-boq.csv",
            [
              "كود",
              "بيان",
              "وحدة",
              "كمية",
              "متبقي",
              "فئة",
              "قيمة",
              "المقاولين",
              "حالة",
            ],
            filteredItems.map((i) => [
              i.itemCode,
              i.description,
              i.unit,
              i.quantity,
              i.remainingQuantity,
              i.unitPrice,
              i.totalValue,
              getContractorsForItem(i),
              i.status,
            ])
          )
        }
        onPrint={() => {
          // Prompt user for logo image
          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = "image/*";
          fileInput.style.display = "none";
          fileInput.onchange = async (e) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            let logoSrc = "";
            if (file) {
              logoSrc = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
              });
            }

            const project = mockProjects.find((p) => p.id === projectId);
            const building = mockBuildings.find((b) => b.id === buildingId);

            // Header with optional logo, project name, and building name (if buildingId exists)
            const headerHtml = `
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #1e3a5f; padding-bottom: 15px; margin-bottom: 20px;">
                <div style="text-align: right; line-height: 1.6;">
                  <h1 style="color: #1e3a5f; font-size: 22px; margin: 0 0 5px 0; font-weight: bold;">
                    ${
                      isArabic
                        ? "الوطنية للمقاولات والتوريدات"
                        : "Al-Wataniya for Contracting & Supplies"
                    }
                  </h1>
                  <h2 style="color: #c9a03d; font-size: 16px; margin: 0 0 5px 0; font-weight: bold;">
                    ${isArabic ? "المقايسة النهائية" : "Final BOQ"}
                  </h2>
                  <div style="font-size: 11px; color: #555;">
                    ${
                      project
                        ? `<div><strong>${
                            isArabic ? "المشروع" : "Project"
                          }:</strong> ${project.name}</div>`
                        : ""
                    }
                    ${
                      buildingId && building
                        ? `<div><strong>${
                            isArabic ? "المبنى" : "Building"
                          }:</strong> ${building.name}</div>`
                        : ""
                    }
                  </div>
                </div>
                ${
                  logoSrc
                    ? `
                  <div>
                    <img src="${logoSrc}" alt="Logo" style="max-height: 80px; max-width: 150px; object-fit: contain;" />
                  </div>
                `
                    : `
                  <div style="width: 80px; height: 80px; border: 2px dashed #c9a03d; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #c9a03d; font-size: 10px; font-weight: bold;">
                    ${isArabic ? "اللوجو" : "Logo"}
                  </div>
                `
                }
              </div>
            `;

            // Helper to get status badges for print
            const getPrintStatusBadge = (status: string) => {
              let bg = "#f3f4f6";
              let color = "#374151";
              let text = isArabic ? "غير متحلل" : "Pending";

              if (status === "distributed") {
                bg = "#dcfce7";
                color = "#15803d";
                text = isArabic ? "مكتمل" : "Completed";
              } else if (status === "partial") {
                bg = "#fef9c3";
                color = "#a16207";
                text = isArabic ? "جزئي" : "Partial";
              } else if (status === "analyzed") {
                bg = "#dbeafe";
                color = "#1d4ed8";
                text = isArabic ? "متحلل" : "Analyzed";
              }
              return `<span style="background:${bg}; color:${color}; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; display: inline-block;">${text}</span>`;
            };

            // Totals
            const totalQuantity = filteredItems.reduce(
              (sum, i) => sum + (i.quantity || 0),
              0
            );
            const totalRemaining = filteredItems.reduce(
              (sum, i) => sum + (i.remainingQuantity || 0),
              0
            );
            const totalValue = filteredItems.reduce(
              (sum, i) => sum + (i.totalValue || 0),
              0
            );

            // Build rows (including component rows where applicable)
            const rows = filteredItems
              .map((i) => {
                let itemRow = `
                  <tr style="background-color: #ffffff; font-weight: bold;">
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-family: monospace;">${
                      i.itemCode
                    }</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${
                      i.description
                    }</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${
                      i.unit
                    }</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${
                      i.quantity
                    }</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #c9a03d;">${
                      i.remainingQuantity
                    }</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${i.unitPrice.toLocaleString()}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 10px;">${getContractorsForItem(
                      i
                    )}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${getPrintStatusBadge(
                      i.status
                    )}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #c9a03d;">${i.totalValue.toLocaleString()}</td>
                  </tr>
                `;

                if (i.isAnalyzed && i.components.length > 0) {
                  const componentRows = i.components
                    .map((comp, cidx) => {
                      const compContractors =
                        comp.distribution.length > 0
                          ? comp.distribution
                              .map((d) => `${d.contractorName} (${d.quantity})`)
                              .join(", ")
                          : isArabic
                          ? "غير موزع"
                          : "Not distributed";
                      const compStatus = comp.isDistributed
                        ? isArabic
                          ? "موزع"
                          : "Distributed"
                        : isArabic
                        ? "قيد التوزيع"
                        : "Pending";
                      const compStatusBg = comp.isDistributed
                        ? "#dcfce7"
                        : "#fef9c3";
                      const compStatusColor = comp.isDistributed
                        ? "#15803d"
                        : "#a16207";

                      return `
                      <tr style="background-color: #f9fafb; font-size: 10px; color: #4b5563;">
                        <td style="padding: 6px; border: 1px solid #eee; text-align: center;">└─ ${
                          cidx + 1
                        }</td>
                        <td style="padding: 6px; border: 1px solid #eee; text-align: right; padding-right: 20px; font-style: italic;">${
                          comp.name
                        }</td>
                        <td style="padding: 6px; border: 1px solid #eee; text-align: center;">${
                          comp.unit
                        }</td>
                        <td style="padding: 6px; border: 1px solid #eee; text-align: center;">${
                          comp.quantity
                        }</td>
                        <td style="padding: 6px; border: 1px solid #eee; text-align: center; color: #c9a03d;">${
                          comp.remainingQuantity
                        }</td>
                        <td style="padding: 6px; border: 1px solid #eee; text-align: center;">${comp.unitPrice.toLocaleString()}</td>
                        <td style="padding: 6px; border: 1px solid #eee; text-align: center; font-size: 9px;">${compContractors}</td>
                        <td style="padding: 6px; border: 1px solid #eee; text-align: center;">
                          <span style="background:${compStatusBg}; color:${compStatusColor}; padding: 2px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; display: inline-block;">${compStatus}</span>
                        </td>
                        <td style="padding: 6px; border: 1px solid #eee; text-align: center; color: #c9a03d;">${comp.totalValue.toLocaleString()}</td>
                      </tr>
                    `;
                    })
                    .join("");
                  itemRow += componentRows;
                }
                return itemRow;
              })
              .join("");

            // Total summary row
            const totalRow = `
              <tr style="font-weight:bold; background-color: #f1f5f9; border-top: 2px solid #1e3a5f;">
                <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: center;">${
                  isArabic ? "الإجمالي العام" : "General Total"
                }</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${totalQuantity.toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #c9a03d;">${totalRemaining.toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #c9a03d; font-size: 13px;">${totalValue.toLocaleString()}</td>
              </tr>
            `;

            // Signature Blocks
            const signaturesHtml = `
              <div style="margin-top: 40px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px; page-break-inside: avoid;">
                ${sigs
                  .map(
                    (s) => `
                  <div style="flex: 1; min-width: 150px; text-align: center; border: 1px dashed #ccc; padding: 10px; border-radius: 8px;">
                    <h4 style="margin: 0 0 5px 0; color: #1e3a5f;">${
                      s.title
                    }</h4>
                    <p style="margin: 0; font-size: 11px;">الاسم: ${s.name}</p>
                    <p style="margin: 5px 0 0 0; font-size: 10px; color: #777;">التوقيع: .....................</p>
                    ${
                      s.date
                        ? `<p style="margin: 3px 0 0 0; font-size: 9px; color: #999;">التاريخ: ${s.date}</p>`
                        : ""
                    }
                  </div>
                `
                  )
                  .join("")}
              </div>
            `;

            const html = `
              ${headerHtml}
              <table style="width:100%; border-collapse: collapse; font-size: 11px; margin: 15px 0;">
                <thead>
                  <tr style="background-color: #1e3a5f; color: #ffffff;">
                    <th style="padding: 8px; border: 1px solid #1e3a5f;">كود</th>
                    <th style="padding: 8px; border: 1px solid #1e3a5f; text-align: right;">بيان البند</th>
                    <th style="padding: 8px; border: 1px solid #1e3a5f;">وحدة</th>
                    <th style="padding: 8px; border: 1px solid #1e3a5f;">كمية</th>
                    <th style="padding: 8px; border: 1px solid #1e3a5f;">متبقي</th>
                    <th style="padding: 8px; border: 1px solid #1e3a5f;">فئة</th>
                    <th style="padding: 8px; border: 1px solid #1e3a5f;">المقاولين</th>
                    <th style="padding: 8px; border: 1px solid #1e3a5f;">حالة</th>
                    <th style="padding: 8px; border: 1px solid #1e3a5f;">إجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                  ${totalRow}
                </tbody>
              </table>
              ${signaturesHtml}
            `;
            printHtml(isArabic ? "المقايسة النهائية" : "Final BOQ", html);
          };
          fileInput.click();
        }}
      />
      <div className="px-6 pb-6">
        {/* ✅ شريط البحث */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={
                isArabic
                  ? "بحث بالكود أو الوصف..."
                  : "Search by code or description..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        {/* ✅ إضافة من جهة الإسناد - مع منع التكرار */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-2"></p>
          <div className="flex flex-wrap gap-2">
            {employerItems.length === 0 ? (
              <span className="text-sm text-gray-400">
                {isArabic
                  ? "لا توجد بنود في جهة الإسناد"
                  : "No items in employer BOQ"}
              </span>
            ) : (
              employerItems
                .filter(
                  (e) =>
                    !items.some(
                      (f) =>
                        f.description === e.description && f.unit === e.unit
                    )
                )
                .map((e) => (
                  <button
                    key={e.itemCode}
                    onClick={() => {
                      const result = importFinalFromEmployer(
                        buildingId,
                        e.itemCode
                      );
                      if (result) {
                        bump();
                        showToast(
                          isArabic
                            ? `تم إضافة البند ${e.itemCode}`
                            : `Added item ${e.itemCode}`,
                          "success"
                        );
                      } else {
                        showToast(
                          isArabic
                            ? `البند "${e.description}" موجود بالفعل`
                            : `Item "${e.description}" already exists`,
                          "error"
                        );
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gold text-gold rounded-lg text-sm hover:bg-gold hover:text-white transition"
                  >
                    <Plus size={14} /> {e.itemCode}
                  </button>
                ))
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-Black-400">
            {items.length > 0 && (
              <span>
                {isArabic
                  ? ` تم إضافة ${items.length} بند`
                  : ` ${items.length} items added`}
              </span>
            )}
            {employerItems.length > 0 && (
              <span>
                {isArabic
                  ? `من إجمالي ${employerItems.length} بند في جهة الإسناد`
                  : ` ${employerItems.length} items in employer BOQ`}
              </span>
            )}
            {employerItems.length > items.length && (
              <span className="text-gold">
                {isArabic
                  ? `⬅️ ${employerItems.length - items.length} بند متاح للإضافة`
                  : `⬅️ ${employerItems.length - items.length} items available`}
              </span>
            )}
          </div>
        </div>

        {/* ✅ جدول البنود */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">كود</th>
                <th className="p-3 text-right">بيان</th>
                <th className="p-3">وحدة</th>
                <th className="p-3">كمية</th>
                <th className="p-3">متبقي</th>
                <th className="p-3">فئة</th>
                <th className="p-3">قيمة</th>
                <th className="p-3">المقاولين</th>
                <th className="p-3">حالة</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-500">
                    {isArabic
                      ? searchTerm
                        ? "لا توجد نتائج للبحث"
                        : "لا توجد بنود"
                      : searchTerm
                      ? "No search results"
                      : "No items"}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <React.Fragment key={item.itemCode}>
                    <tr className="border-t hover:bg-gray-50">
                      <td className="p-3 text-center">{idx + 1}</td>
                      <td className="p-3 font-mono">{item.itemCode}</td>
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-center">{item.unit}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-center font-bold text-gold">
                        {item.remainingQuantity}
                      </td>
                      <td className="p-3 text-center">
                        {item.unitPrice.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-bold text-gold">
                        {item.totalValue.toLocaleString()}
                      </td>
                      <td className="p-3 text-center text-xs">
                        {getContractorsForItem(item)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            item.status === "distributed"
                              ? "bg-green-100 text-green-800"
                              : item.status === "partial"
                              ? "bg-yellow-100 text-yellow-800"
                              : item.status === "analyzed"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.status === "distributed"
                            ? isArabic
                              ? "مكتمل"
                              : "Completed"
                            : item.status === "partial"
                            ? isArabic
                              ? "جزئي"
                              : "Partial"
                            : item.status === "analyzed"
                            ? isArabic
                              ? "متحلل"
                              : "Analyzed"
                            : isArabic
                            ? "غير متحلل"
                            : "Pending"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2 flex-wrap">
                          {!item.isAnalyzed && (
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setShowAnalyzeModal(true);
                              }}
                              className="text-gold hover:text-gold/80 p-1"
                              title={isArabic ? "تحليل البند" : "Analyze Item"}
                            >
                              <Layers size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditItem(item);
                              setShowEditItemModal(true);
                            }}
                            className="text-blue-500 hover:text-blue-700 p-1"
                            title={isArabic ? "تعديل البند" : "Edit Item"}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteCode(item.itemCode)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {item.isAnalyzed && item.components.length > 0 && (
                      <ComponentsSubTable
                        components={item.components}
                        item={item}
                        onDistribute={(comp) => {
                          setSelectedItem(item);
                          setSelectedComponent(comp);
                          setShowDistributeModal(true);
                        }}
                        onEditComponent={(comp) => {
                          setSelectedItem(item);
                          setEditingComponent(comp);
                          setShowEditComponentModal(true);
                        }}
                        isArabic={isArabic}
                      />
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <SignaturesSection
          isArabic={isArabic}
          signatures={sigs}
          onChange={(n) => {
            setSigs(n);
            setDocSignatures(docKey, n);
          }}
        />
      </div>

      {/* Edit Item Modal */}
      <EditItemModal
        isOpen={showEditItemModal}
        onClose={() => {
          setShowEditItemModal(false);
          setEditItem(null);
        }}
        item={editItem}
        onSave={handleEditItemSave}
        isArabic={isArabic}
      />

      {/* Edit Component Modal */}
      <EditComponentModal
        isOpen={showEditComponentModal}
        onClose={() => {
          setShowEditComponentModal(false);
          setEditingComponent(null);
          setSelectedItem(null);
        }}
        item={selectedItem}
        component={editingComponent}
        onSave={handleEditComponentSave}
        isArabic={isArabic}
      />

      {/* Delete Modal */}
      {deleteCode && (
        <DeleteConfirmModal
          isArabic={isArabic}
          message="حذف البند؟"
          onCancel={() => setDeleteCode(null)}
          onConfirm={() => {
            removeFinalItem(buildingId, deleteCode);
            setDeleteCode(null);
            bump();
          }}
        />
      )}

      {/* Analyze Modal */}
      <AnalyzeItemModal
        isOpen={showAnalyzeModal}
        onClose={() => {
          setShowAnalyzeModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem!}
        onAnalyze={handleAnalyze}
        isArabic={isArabic}
      />

      {/* Distribute Modal */}
      <DistributeComponentModal
        isOpen={showDistributeModal}
        onClose={() => {
          setShowDistributeModal(false);
          setSelectedComponent(null);
          setSelectedItem(null);
        }}
        item={selectedItem}
        component={selectedComponent}
        onDistribute={handleDistribute}
        isArabic={isArabic}
      />
    </div>
  );
}
