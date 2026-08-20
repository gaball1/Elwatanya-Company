/* eslint-disable */
"use client";
import React from "react";

import { useParams } from "next/navigation";
import { companyService } from "@/services/company.service";
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
  Undo2,
} from "lucide-react";
import BoqPageHeader from "@/components/boq/BoqPageHeader";
import SignaturesSection from "@/components/boq/SignaturesSection";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { exportToCsv, printHtml } from "@/lib/documentUtils";
import { getDocSignatures, setDocSignatures } from "@/lib/signatures";
import DataLoader from "@/components/shared/DataLoader";
import type { EmployerBoqItem, FinalBoqItem, FinalBoqComponent } from "@/types/boq";
import { employerBoqService } from "@/services/employerBoq.service";
import { finalBoqService } from "@/services/finalBoq.service";
import { distributionService } from "@/services/distribution.service";
import { buildingService } from "@/services/building.service";
import { projectService } from "@/services/project.service";
import { buildingSubcontractorService } from "@/services/building-subcontractor.service";
import { Can } from "@/components/Can";

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
    if (overBudget) {
      return;
    }
    onAnalyze(validComponents);
  };

  const validComponents = components.filter(
    (c) => c.name.trim() && c.unitPrice > 0
  );
  const totalAnalysisValue = validComponents.reduce(
    (sum, c) => sum + (item?.quantity || 0) * c.unitPrice,
    0
  );
  const overBudget = totalAnalysisValue > (item?.totalValue || 0);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-surface">
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "تحليل البند" : "Analyze Item"}: {item.itemCode}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-surface-secondary p-3 rounded-lg">
            <p className="text-sm text-text-secondary">
              {isArabic ? "البند:" : "Item:"}{" "}
              <span className="font-bold">{item.description}</span>
            </p>
            <p className="text-sm text-text-secondary">
              {isArabic ? "الكمية:" : "Quantity:"}{" "}
              <span className="font-bold">
                {item.quantity} {item.unit}
              </span>
            </p>
            <p className="text-sm text-warning-dark mt-2">
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
                  value={comp.unitPrice ?? ""}
                  onChange={(e) =>
                    updateComponent(idx, "unitPrice", Number(e.target.value))
                  }
                  className="w-28 p-2 border rounded-lg text-sm"
                  placeholder={isArabic ? "السعر" : "Price"}
                  min={0}
                />
                <span className="text-xs text-text-muted w-16 text-center">
                  {item.quantity} {item.unit}
                </span>
                <button
                  onClick={() => removeComponent(idx)}
                  className="text-danger hover:text-danger-dark p-1"
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

          <div
            className={`p-3 rounded-lg ${
              overBudget ? "bg-danger/10 border border-danger" : "bg-surface-secondary"
            }`}
          >
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {isArabic ? "إجمالي التحليل:" : "Analysis Total:"}
              </span>
              <span className={`font-bold ${overBudget ? "text-danger" : "text-text-primary"}`}>
                {totalAnalysisValue.toLocaleString()} ج.م
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {isArabic ? "قيمة البند الأصلي:" : "Original Item Value:"}
              </span>
              <span className="font-bold text-text-primary">
                {item.totalValue.toLocaleString()} ج.م
              </span>
            </div>
            {overBudget && (
              <p className="text-danger text-sm mt-1">
                {isArabic
                  ? `إجمالي التحليل يتجاوز قيمة البند الأصلي بمقدار ${(totalAnalysisValue - item.totalValue).toLocaleString()} ج.م`
                  : `Analysis total exceeds the original item value by ${(totalAnalysisValue - item.totalValue).toLocaleString()}`}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-3 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-surface-secondary"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={overBudget}
              className={`flex-1 px-4 py-2 rounded-lg text-white ${
                overBudget
                  ? "bg-surface-tertiary cursor-not-allowed"
                  : "bg-gold hover:bg-gold/80"
              }`}
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
  subcontractors,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: FinalBoqItem | null;
  component: FinalBoqComponent | null;
  onDistribute: (
    distribution: { contractorId: string; quantity: number }[]
  ) => void;
  isArabic: boolean;
  subcontractors: { id: string; name: string }[];
}) {
  const [distribution, setDistribution] = useState([
    { contractorId: "", quantity: 0 },
  ]);

  useEffect(() => {
    if (isOpen && component) {
      const existing = (component.distribution || []).map((d) => ({
        contractorId: d.contractorId,
        quantity: d.quantity,
      }));
      setDistribution(
        existing.length > 0
          ? existing
          : [{ contractorId: "", quantity: 0 }]
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, component?.id]);

  if (!isOpen || !component || !item) {
    return null;
  }

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
    if (validDistribution.length === 0 || total > component.quantity) {
      return;
    }
    onDistribute(validDistribution);
  };

  const canSubmit = totalDistributed > 0 && totalDistributed <= component.quantity;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-surface">
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "توزيع المكون" : "Distribute Component"}:{" "}
            {component.name}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-surface-secondary p-3 rounded-lg">
            <p className="text-sm text-text-secondary">
              {isArabic ? "المكون:" : "Component:"}{" "}
              <span className="font-bold">{component.name}</span>
            </p>
            <p className="text-sm text-text-secondary">
              {isArabic ? "الكمية الكلية:" : "Total Quantity:"}{" "}
              <span className="font-bold">
                {component.quantity} {component.unit}
              </span>
            </p>
            <p className="text-sm text-text-secondary">
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
                  {subcontractors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={dist.quantity ?? ""}
                  onChange={(e) =>
                    updateRow(idx, "quantity", Number(e.target.value))
                  }
                  className="w-32 p-2 border rounded-lg text-sm"
                  placeholder={isArabic ? "الكمية" : "Qty"}
                  min={0}
                  max={component.quantity}
                />
                <span className="text-xs text-text-muted w-16 text-center">
                  {dist.quantity && component.quantity
                    ? ((dist.quantity / component.quantity) * 100).toFixed(1)
                    : 0}
                  %
                </span>
                <button
                  onClick={() => removeRow(idx)}
                  className="text-danger hover:text-danger-dark p-1"
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
              remaining === 0 ? "bg-success-light" : "bg-warning-light"
            }`}
          >
            <p className="text-sm">
              {isArabic ? "المتبقي للتوزيع:" : "Remaining for distribution:"}{" "}
              <span
                className={`font-bold ${
                  remaining === 0 ? "text-success-dark" : "text-warning-dark"
                }`}
              >
                {remaining} {component.unit}
              </span>
            </p>
          </div>

          <div className="flex gap-3 pt-3 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-surface-secondary"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex-1 px-4 py-2 rounded-lg text-white ${
                canSubmit
                  ? "bg-gold hover:bg-gold/80"
                  : "bg-surface-tertiary cursor-not-allowed"
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
// ✅ مودال توزيع البند غير المتحلل
// ============================================
function DistributeItemModal({
  isOpen,
  onClose,
  item,
  onDistribute,
  isArabic,
  subcontractors,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: FinalBoqItem | null;
  onDistribute: (
    distribution: { contractorId: string; quantity: number }[]
  ) => void;
  isArabic: boolean;
  subcontractors: { id: string; name: string }[];
}) {
  const [distribution, setDistribution] = useState([
    { contractorId: "", quantity: 0 },
  ]);

  useEffect(() => {
    if (isOpen && item) {
      const existing = (item.itemDistribution || []).map((d) => ({
        contractorId: d.contractorId,
        quantity: d.quantity,
      }));
      setDistribution(
        existing.length > 0
          ? existing
          : [{ contractorId: "", quantity: 0 }]
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.itemCode]);

  if (!isOpen || !item) {
    return null;
  }

  const totalDistributed = distribution.reduce((sum, d) => sum + d.quantity, 0);
  const remaining = item.quantity - totalDistributed;

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
    if (validDistribution.length === 0 || total > item.quantity) {
      return;
    }
    onDistribute(validDistribution);
  };

  const canSubmit = totalDistributed > 0 && totalDistributed <= item.quantity;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-surface">
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "توزيع البند" : "Distribute Item"}: {item.itemCode}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-surface-secondary p-3 rounded-lg">
            <p className="text-sm text-text-secondary">
              {isArabic ? "البند:" : "Item:"}{" "}
              <span className="font-bold">{item.description}</span>
            </p>
            <p className="text-sm text-text-secondary">
              {isArabic ? "الكمية الكلية:" : "Total Quantity:"}{" "}
              <span className="font-bold">
                {item.quantity} {item.unit}
              </span>
            </p>
            <p className="text-sm text-text-secondary">
              {isArabic ? "السعر:" : "Price:"}{" "}
              <span className="font-bold">{item.unitPrice} ج.م</span>
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
                  {subcontractors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={dist.quantity ?? ""}
                  onChange={(e) =>
                    updateRow(idx, "quantity", Number(e.target.value))
                  }
                  className="w-32 p-2 border rounded-lg text-sm"
                  placeholder={isArabic ? "الكمية" : "Qty"}
                  min={0}
                  max={item.quantity}
                />
                <span className="text-xs text-text-muted w-16 text-center">
                  {dist.quantity && item.quantity
                    ? ((dist.quantity / item.quantity) * 100).toFixed(1)
                    : 0}
                  %
                </span>
                <button
                  onClick={() => removeRow(idx)}
                  className="text-danger hover:text-danger-dark p-1"
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
              remaining === 0 ? "bg-success-light" : "bg-warning-light"
            }`}
          >
            <p className="text-sm">
              {isArabic ? "المتبقي للتوزيع:" : "Remaining for distribution:"}{" "}
              <span
                className={`font-bold ${
                  remaining === 0 ? "text-success-dark" : "text-warning-dark"
                }`}
              >
                {remaining} {item.unit}
              </span>
            </p>
          </div>

          <div className="flex gap-3 pt-3 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-surface-secondary"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex-1 px-4 py-2 rounded-lg text-white ${
                canSubmit
                  ? "bg-gold hover:bg-gold/80"
                  : "bg-surface-tertiary cursor-not-allowed"
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
      <div className="bg-surface rounded-2xl w-full max-w-md">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "تعديل البند" : "Edit Item"}: {item.itemCode}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
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
            <label className="block text-sm font-medium text-text-primary mb-1">
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

          <div className="bg-surface-secondary p-3 rounded-lg">
            <p className="text-sm text-text-secondary">
              {isArabic ? "القيمة الإجمالية:" : "Total Value:"}{" "}
              <span className="font-bold text-gold">
                {(quantity * unitPrice).toLocaleString()} ج.م
              </span>
            </p>
            {item.isAnalyzed && (
              <p className="text-xs text-warning-dark mt-1">
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
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-surface-secondary"
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
  const [unitPrice, setUnitPrice] = useState(component?.unitPrice ?? 0);

  useEffect(() => {
    if (isOpen && component) {
      setUnitPrice(component.unitPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, component?.id]);

  if (!isOpen || !item || !component) {
    return null;
  }

  const otherComponentsTotal = item.components
    .filter((c) => c.id !== component.id)
    .reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);
  const newTotalValue = otherComponentsTotal + component.quantity * unitPrice;
  const overBudget = newTotalValue > item.totalValue;

  const handleSubmit = () => {
    if (unitPrice < 0 || overBudget) return;
    onSave(unitPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "تعديل المكون" : "Edit Component"}: {component.name}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-surface-secondary p-3 rounded-lg">
            <p className="text-sm text-text-secondary">
              {isArabic ? "المكون:" : "Component:"}{" "}
              <span className="font-bold">{component.name}</span>
            </p>
            <p className="text-sm text-text-secondary">
              {isArabic ? "الكمية:" : "Quantity:"}{" "}
              <span className="font-bold">
                {component.quantity} {component.unit}
              </span>
            </p>
            <p className="text-sm text-text-secondary">
              {isArabic ? "السعر الحالي:" : "Current Price:"}{" "}
              <span className="font-bold">{component.unitPrice} ج.م</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
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

          <div
            className={`p-3 rounded-lg ${
              overBudget ? "bg-danger/10 border border-danger" : "bg-surface-secondary"
            }`}
          >
            <p className="text-sm text-text-secondary">
              {isArabic ? "القيمة الجديدة للمكون:" : "New Component Value:"}{" "}
              <span className="font-bold text-gold">
                {(component.quantity * unitPrice).toLocaleString()} ج.م
              </span>
            </p>
            <p className="text-sm text-text-secondary">
              {isArabic ? "إجمالي التحليل بعد التعديل:" : "Analysis Total After Edit:"}{" "}
              <span className={`font-bold ${overBudget ? "text-danger" : "text-text-primary"}`}>
                {newTotalValue.toLocaleString()} ج.م
              </span>
            </p>
            <p className="text-sm text-text-secondary">
              {isArabic ? "قيمة البند الأصلي:" : "Original Item Value:"}{" "}
              <span className="font-bold text-text-primary">
                {item.totalValue.toLocaleString()} ج.م
              </span>
            </p>
            {overBudget && (
              <p className="text-danger text-sm mt-1">
                {isArabic
                  ? "إجمالي التحليل يتجاوز قيمة البند الأصلي"
                  : "Analysis total exceeds the original item value"}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-surface-secondary"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={overBudget}
              className={`flex-1 px-4 py-2 rounded-lg text-white ${
                overBudget
                  ? "bg-surface-tertiary cursor-not-allowed"
                  : "bg-gold hover:bg-gold/80"
              }`}
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
  onRemoveDistribution,
  onEditDistribution,
  isArabic,
}: {
  components: FinalBoqComponent[];
  item: FinalBoqItem;
  onDistribute: (component: FinalBoqComponent) => void;
  onEditComponent: (component: FinalBoqComponent) => void;
  onRemoveDistribution: (component: FinalBoqComponent) => void;
  onEditDistribution: (component: FinalBoqComponent) => void;
  isArabic: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  if (components.length === 0) return null;

  return (
    <tr>
      <td colSpan={11} className="p-0">
        <div className="bg-surface-secondary/50 border-t">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 px-4 py-1 text-xs text-text-secondary hover:text-primary"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {isArabic ? "المكونات" : "Components"} ({components.length})
          </button>
          {expanded && (
            <table className="w-full text-xs">
              <thead className="bg-surface-tertiary">
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
                    <tr key={comp.id} className="border-t hover:bg-surface-secondary">
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
                              ? "bg-success-light text-success-dark"
                              : "bg-warning-light text-warning-dark"
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
                          <Can permission="final-boq.update">
                            {!comp.isDistributed ? (
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
                            ) : (
                              <button
                                onClick={() => onEditDistribution(comp)}
                                className="text-gold hover:underline text-xs flex items-center gap-1"
                              >
                                <Edit2 size={14} />
                                {isArabic ? "تعديل التوزيع" : "Edit Distribution"}
                              </button>
                            )}
                          </Can>
                          <Can permission="final-boq.update">
                            {comp.isDistributed && (
                              <button
                                onClick={() => onRemoveDistribution(comp)}
                                className="text-danger hover:text-danger-dark text-xs flex items-center gap-1"
                              >
                                <Trash2 size={14} />
                                {isArabic ? "إلغاء التوزيع" : "Undo Distribution"}
                              </button>
                            )}
                          </Can>
                          <Can permission="final-boq.update">
                            <button
                              onClick={() => {
                                onEditComponent(comp);
                              }}
                              className="text-info hover:text-info-dark text-xs p-1"
                              title={isArabic ? "تعديل السعر" : "Edit Price"}
                            >
                              <Edit2 size={14} />
                            </button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gold/50 bg-surface-tertiary font-bold">
                  <td className="p-2 text-center text-xs">
                    {isArabic ? "مجموع التحليل" : "Analysis Subtotal"}
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                  <td className="p-2 text-center">
                    {components.reduce((s, c) => s + (c.quantity || 0), 0)}
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                  <td className="p-2 text-center text-gold">
                    {components
                      .reduce((s, c) => s + (c.totalValue || 0), 0)
                      .toLocaleString()}
                  </td>
                  <td className="p-2" colSpan={3}></td>
                </tr>
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
  const buildingId = (params.buildingId as string) ?? "";
  const [building, setBuilding] = useState<any>(null);
  useEffect(() => {
    if (buildingId) {
      buildingService.getBuilding(buildingId).then(setBuilding).catch(console.error);
    }
  }, [buildingId]);
  const docKey = `final:${buildingId}`;
  const back = `/${locale}/projects/${projectId}/buildings/${buildingId}/estimates`;
  const { showToast, ToastComponent } = useToast();
  const [, refresh] = useState(0);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FinalBoqItem[]>([]);
  const [sigs, setSigs] = useState(getDocSignatures(docKey));
  const [employerItems, setEmployerItems] = useState<EmployerBoqItem[]>([]);
  const [subcontractors, setSubcontractors] = useState<{ id: string; name: string }[]>([]);
  const [project, setProject] = useState<any>(null);
  const [editItem, setEditItem] = useState<FinalBoqItem | null>(null);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FinalBoqItem | null>(null);
  const [selectedComponent, setSelectedComponent] =
    useState<FinalBoqComponent | null>(null);
  const [showDistributeItemModal, setShowDistributeItemModal] = useState(false);
  const [distributeItemTarget, setDistributeItemTarget] =
    useState<FinalBoqItem | null>(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showEditComponentModal, setShowEditComponentModal] = useState(false);
  const [editingComponent, setEditingComponent] =
    useState<FinalBoqComponent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [removeComponentConfirm, setRemoveComponentConfirm] = useState<{
    item: FinalBoqItem;
    comp: FinalBoqComponent;
  } | null>(null);
  const [removingDistribution, setRemovingDistribution] = useState(false);

  const bump = () => refresh((n) => n + 1);

  const loadItems = async () => {
    if (!buildingId) return;
    try {
      setLoading(true);
      const data = await finalBoqService.list(buildingId);
      setItems(data);
    } catch (e) {
      console.error(e);
      showToast(isArabic ? "فشل تحميل المقايسة النهائية" : "Failed to load final BOQ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (buildingId) {
      loadItems();
      employerBoqService.list(buildingId)
        .then(setEmployerItems)
        .catch((e) => {
          console.error(e);
          showToast(isArabic ? "فشل تحميل بنود جهة الإسناد" : "Failed to load employer items", "error");
        });
      buildingSubcontractorService
        .listByBuilding(buildingId)
        .then((list) =>
          setSubcontractors(
            list.map((b) => ({ id: b.subcontractorId, name: b.subcontractor.name }))
          )
        )
        .catch(console.error);
      projectService.getProject(projectId)
        .then(setProject)
        .catch(console.error);
    }
  }, [buildingId, isArabic]);

  const filteredItems = items.filter(
    (item) =>
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContractorsForItem = (item: FinalBoqItem): string => {
    if (!item.isAnalyzed) {
      if (item.itemDistribution && item.itemDistribution.length > 0) {
        return item.itemDistribution
          .map((d) => `${d.contractorName} (${d.quantity})`)
          .join(", ");
      }
      return isArabic ? "غير موزع" : "Not distributed";
    }
    if (item.components.length === 0) {
      return isArabic ? "غير موزع" : "Not distributed";
    }

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

  const effectiveTotal = (item: FinalBoqItem): number => {
    if (item.isAnalyzed && item.components.length > 0) {
      return item.components.reduce((s, c) => s + (c.totalValue || 0), 0);
    }
    return item.totalValue || 0;
  };

  const handleAnalyze = async (
    components: { name: string; unit: string; unitPrice: number }[]
  ) => {
    if (selectedItem) {
      try {
        await finalBoqService.analyze(buildingId, selectedItem.itemCode, components);
        showToast(
          isArabic ? "تم تحليل البند بنجاح" : "Item analyzed successfully",
          "success"
        );
        await loadItems();
        setShowAnalyzeModal(false);
        setSelectedItem(null);
      } catch (e: any) {
        showToast(e?.message || "خطأ", "error");
      }
    }
  };

  const handleUnanalyze = async (itemCode: string) => {
    try {
      await finalBoqService.unanalyze(buildingId, itemCode);
      showToast(
        isArabic ? "تم إلغاء تحليل البند" : "Item unanalyzed",
        "success"
      );
      await loadItems();
    } catch (e: any) {
      showToast(e?.message || "خطأ", "error");
    }
  };

  const handleDistribute = async (
    distribution: { contractorId: string; quantity: number }[]
  ) => {
    if (selectedItem && selectedComponent) {
      try {
        await distributionService.distribute(
          buildingId,
          selectedItem.itemCode,
          selectedComponent.id,
          distribution
        );
        showToast(
          isArabic ? "تم توزيع المكون بنجاح" : "Component distributed successfully",
          "success"
        );
        await loadItems();
        setShowDistributeModal(false);
        setSelectedComponent(null);
        setSelectedItem(null);
      } catch (e: any) {
        showToast(e?.message || "خطأ", "error");
      }
    }
  };

  const handleDistributeItem = async (
    distribution: { contractorId: string; quantity: number }[]
  ) => {
    if (distributeItemTarget) {
      try {
        await distributionService.distributeItem(
          buildingId,
          distributeItemTarget.itemCode,
          distribution
        );
        showToast(
          isArabic ? "تم توزيع البند بنجاح" : "Item distributed successfully",
          "success"
        );
        await loadItems();
        setShowDistributeItemModal(false);
        setDistributeItemTarget(null);
      } catch (e: any) {
        showToast(e?.message || "خطأ", "error");
      }
    }
  };

  const handleRemoveComponentDistribution = async () => {
    if (!removeComponentConfirm) return;
    const { item, comp } = removeComponentConfirm;
    setRemovingDistribution(true);
    try {
      for (const d of comp.distribution) {
        await distributionService.removeDistribution(
          buildingId,
          item.itemCode,
          d.contractorId,
          comp.id
        );
      }
      showToast(
        isArabic ? "تم إلغاء توزيع المكون" : "Component distribution removed",
        "success"
      );
      await loadItems();
      setRemoveComponentConfirm(null);
      setSelectedItem(null);
      setSelectedComponent(null);
    } catch (e: any) {
      showToast(e?.message || "خطأ", "error");
    } finally {
      setRemovingDistribution(false);
    }
  };

  const handleRemoveItemDistribution = async (target?: FinalBoqItem) => {
    const item = target ?? distributeItemTarget;
    if (!item) return;
    const allocations = item.itemDistribution ?? [];
    if (allocations.length === 0) return;
    setRemovingDistribution(true);
    try {
      for (const d of allocations) {
        await distributionService.removeDistribution(
          buildingId,
          item.itemCode,
          d.contractorId
        );
      }
      showToast(
        isArabic ? "تم إلغاء توزيع البند" : "Item distribution removed",
        "success"
      );
      await loadItems();
      setShowDistributeItemModal(false);
      setDistributeItemTarget(null);
    } catch (e: any) {
      showToast(e?.message || "خطأ", "error");
    } finally {
      setRemovingDistribution(false);
    }
  };

  const handleEditItemSave = async (quantity: number, unitPrice: number) => {
    if (editItem) {
      try {
        const updated = await finalBoqService.updateQuantity(buildingId, editItem.itemCode, quantity, unitPrice);
        showToast(
          isArabic ? "تم تعديل البند بنجاح" : "Item updated successfully",
          "success"
        );
        if (quantity > editItem.quantity && (updated.remainingQuantity || 0) > 0) {
          showToast(
            isArabic
              ? `مازال هناك كمية (${updated.remainingQuantity}) في بند ${updated.itemCode} لم توزع`
              : `There is still quantity (${updated.remainingQuantity}) in item ${updated.itemCode} not yet distributed`,
            "warning"
          );
        }
        await loadItems();
        setEditItem(null);
        setShowEditItemModal(false);
      } catch (e: any) {
        showToast(
          e?.message || (isArabic
            ? "لا يمكن تقليل كمية بند تم تحليله أو توزيعه"
            : "Cannot decrease quantity of an item that has been analyzed or distributed"),
          "error"
        );
      }
    }
  };

  const handleEditComponentSave = async (newPrice: number) => {
    if (selectedItem && editingComponent) {
      try {
        await finalBoqService.updateComponent(
          buildingId,
          selectedItem.itemCode,
          editingComponent.id,
          { unitPrice: newPrice, quantity: editingComponent.quantity }
        );
        showToast(
          isArabic ? "تم تعديل المكون بنجاح" : "Component updated successfully",
          "success"
        );
        await loadItems();
        setShowEditComponentModal(false);
        setEditingComponent(null);
        setSelectedItem(null);
      } catch (e: any) {
        showToast(
          isArabic ? "فشل تعديل المكون" : "Failed to update component",
          "error"
        );
      }
    }
  };

  // ✅ لو مش mounted، ارجع loading
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-light -m-6 flex items-center justify-center">
        <DataLoader />
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
              effectiveTotal(i),
              getContractorsForItem(i),
              i.status,
            ])
          )
        }
        onPrint={async (logoUrl) => {
            const buildingData = building || { name: "", code: "" };
            const companyData = await companyService.get().catch(() => null);
            const companyName = isArabic ? (companyData?.arabicName || companyData?.name || "") : (companyData?.name || companyData?.arabicName || "");

            // Header with optional logo, project name, and building name (if buildingId exists)
            const headerHtml = `
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #1e3a5f; padding-bottom: 15px; margin-bottom: 20px;">
                <div style="text-align: right; line-height: 1.6;">
                  <h1 style="color: #1e3a5f; font-size: 22px; margin: 0 0 5px 0; font-weight: bold;">
                    ${companyName}
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
                      buildingId && buildingData
                        ? `<div><strong>${
                            isArabic ? "المبنى" : "Building"
                          }:</strong> ${buildingData.name}</div>`
                        : ""
                    }
                  </div>
                </div>
                ${
                  logoUrl
                    ? `
                  <div>
                    <img src="${logoUrl}" alt="Logo" style="max-height: 80px; max-width: 150px; object-fit: contain;" />
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
                bg = "#dce7f3";
                color = "#3d6594";
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
              (sum, i) => sum + effectiveTotal(i),
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
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #c9a03d;">${effectiveTotal(i).toLocaleString()}</td>
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
                  const compSubtotal = i.components.reduce(
                    (s, c) => s + (c.totalValue || 0),
                    0
                  );
                  itemRow += componentRows;
                  itemRow += `
                    <tr style="background-color: #eef2f7; font-weight: bold; font-size: 10px; color: #1e3a5f;">
                      <td style="padding: 6px; border: 1px solid #eee; text-align: center;">═</td>
                      <td style="padding: 6px; border: 1px solid #eee; text-align: right; padding-right: 20px;">${
                        isArabic ? "مجموع التحليل" : "Analysis Subtotal"
                      }</td>
                      <td style="padding: 6px; border: 1px solid #eee; text-align: center;"></td>
                      <td style="padding: 6px; border: 1px solid #eee; text-align: center;">${i.components.reduce(
                        (s, c) => s + (c.quantity || 0),
                        0
                      )}</td>
                      <td style="padding: 6px; border: 1px solid #eee; text-align: center;"></td>
                      <td style="padding: 6px; border: 1px solid #eee; text-align: center;"></td>
                      <td style="padding: 6px; border: 1px solid #eee; text-align: center;"></td>
                      <td style="padding: 6px; border: 1px solid #eee; text-align: center;"></td>
                      <td style="padding: 6px; border: 1px solid #eee; text-align: center; color: #c9a03d;">${compSubtotal.toLocaleString()}</td>
                    </tr>
                  `;
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
            printHtml(isArabic ? "المقايسة النهائية" : "Final BOQ", html, "", { logoUrl });
        }}
      />
      <div className="px-6 pb-6">
        {/* ✅ شريط البحث */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
            <input
              type="text"
              placeholder={
                isArabic
                  ? "بحث بالكود أو الوصف..."
                  : "Search by code or description..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        {/* ✅ إضافة من جهة الإسناد - مع منع التكرار */}
        <div className="bg-surface rounded-xl p-4 mb-4 shadow-sm">
          <p className="text-sm text-text-secondary mb-2"></p>
          <div className="flex flex-wrap gap-2">
            {employerItems.length === 0 ? (
              <span className="text-sm text-text-muted">
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
                  <Can key={e.itemCode} permission="final-boq.create">
                    <button
                      onClick={async () => {
                        try {
                          await finalBoqService.importFromEmployer(buildingId, e.itemCode);
                          await loadItems();
                          showToast(
                            isArabic
                              ? `تم إضافة البند ${e.itemCode}`
                              : `Added item ${e.itemCode}`,
                            "success"
                          );
                        } catch (err: any) {
                          showToast(
                            err?.message || (isArabic
                              ? `البند "${e.description}" موجود بالفعل`
                              : `Item "${e.description}" already exists`),
                            "error"
                          );
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gold text-gold rounded-lg text-sm hover:bg-gold hover:text-white transition"
                    >
                      <Plus size={14} /> {e.itemCode}
                    </button>
                  </Can>
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
        <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary">
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
                  <td colSpan={11} className="p-8 text-center text-text-secondary">
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
                    <tr className="border-t hover:bg-surface-secondary">
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
                              ? "bg-success-light text-success-dark"
                              : item.status === "partial"
                              ? "bg-warning-light text-warning-dark"
                              : item.status === "analyzed"
                              ? "bg-info-light text-info-dark"
                              : "bg-surface-tertiary text-text-secondary"
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
                          <Can permission="final-boq.update">
                            {!item.isAnalyzed && (
                              <button
                                onClick={() => {
                                  setDistributeItemTarget(item);
                                  setShowDistributeItemModal(true);
                                }}
                                className="text-gold hover:text-gold/80 p-1"
                                title={isArabic ? "توزيع البند" : "Distribute Item"}
                              >
                                <Users size={16} />
                              </button>
                            )}
                          </Can>
                          <Can permission="final-boq.update">
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
                           </Can>
                           <Can permission="final-boq.update">
                            {item.isAnalyzed && (
                              <button
                                onClick={() => {
                                  if (confirm(isArabic ? "هل تريد إلغاء تحليل هذا البند؟" : "Unanalyze this item?")) {
                                    handleUnanalyze(item.itemCode);
                                  }
                                }}
                                className="text-danger hover:text-danger-dark p-1"
                                title={isArabic ? "إلغاء تحليل البند" : "Unanalyze Item"}
                              >
                                <Undo2 size={16} />
                              </button>
                            )}
                          </Can>
                          <Can permission="final-boq.update">
                            {!item.isAnalyzed && (
                              <button
                                onClick={() => {
                                  setEditItem(item);
                                  setShowEditItemModal(true);
                                }}
                                className="text-info hover:text-info-dark p-1"
                                title={isArabic ? "تعديل البند" : "Edit Item"}
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                          </Can>
                          <Can permission="final-boq.update">
                            {!item.isAnalyzed &&
                              (item.itemDistribution?.length ?? 0) > 0 && (
                                <button
                                  onClick={() => handleRemoveItemDistribution(item)}
                                  className="text-danger hover:text-danger-dark p-1"
                                  title={
                                    isArabic
                                      ? "إلغاء توزيع البند"
                                      : "Undo Item Distribution"
                                  }
                                >
                                  <X size={16} />
                                </button>
                              )}
                          </Can>
                          <Can permission="final-boq.delete">
                            <button
                              onClick={() => setDeleteCode(item.itemCode)}
                              className="text-danger hover:text-danger-dark p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </Can>
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
                        onRemoveDistribution={(comp) => {
                          setSelectedItem(item);
                          setRemoveComponentConfirm({ item, comp });
                        }}
                        onEditDistribution={(comp) => {
                          setSelectedItem(item);
                          setSelectedComponent(comp);
                          setShowDistributeModal(true);
                        }}
                        isArabic={isArabic}
                      />
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-surface-tertiary font-bold border-t-2 border-gold/50">
                <td colSpan={4} className="p-3 text-center text-sm">
                  {isArabic ? "الإجمالي العام" : "Grand Total"}
                </td>
                <td className="p-3 text-center">
                  {filteredItems
                    .reduce((s, i) => s + (i.quantity || 0), 0)
                    .toLocaleString()}
                </td>
                <td className="p-3 text-center text-gold">
                  {filteredItems
                    .reduce((s, i) => s + (i.remainingQuantity || 0), 0)
                    .toLocaleString()}
                </td>
                <td className="p-3"></td>
                <td className="p-3 text-center text-gold">
                  {filteredItems
                    .reduce((s, i) => s + effectiveTotal(i), 0)
                    .toLocaleString()}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
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
          onConfirm={async () => {
            try {
              await finalBoqService.remove(buildingId, deleteCode);
              showToast(isArabic ? "تم حذف البند" : "Item deleted", "success");
              await loadItems();
            } catch (e: any) {
              showToast(e?.message || "خطأ", "error");
            }
            setDeleteCode(null);
          }}
        />
      )}

      {/* Undo Component Distribution Modal */}
      {removeComponentConfirm && (
        <DeleteConfirmModal
          isArabic={isArabic}
          message={
            isArabic
              ? `إلغاء توزيع المكون "${removeComponentConfirm.comp.name}"؟ ستعود الكمية للتوزيع من جديد.`
              : `Remove distribution for component "${removeComponentConfirm.comp.name}"? Quantity becomes available again.`
          }
          onCancel={() => {
            setRemoveComponentConfirm(null);
            setSelectedItem(null);
          }}
          onConfirm={handleRemoveComponentDistribution}
          confirmDisabled={removingDistribution}
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

      {/* Distribute Item Modal */}
      <DistributeItemModal
        isOpen={showDistributeItemModal}
        onClose={() => {
          setShowDistributeItemModal(false);
          setDistributeItemTarget(null);
        }}
        item={distributeItemTarget}
        onDistribute={handleDistributeItem}
        isArabic={isArabic}
        subcontractors={subcontractors}
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
        subcontractors={subcontractors}
      />
    </div>
  );
}
