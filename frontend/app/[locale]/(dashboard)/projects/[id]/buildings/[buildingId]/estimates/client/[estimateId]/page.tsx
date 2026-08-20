/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui";
import { Plus, Edit2, Trash2, X, Download } from "lucide-react";
import { employerBoqService } from "@/services/employerBoq.service";
import BackButton from "@/components/shared/BackButton";
import DataLoader from "@/components/shared/DataLoader";
import { useToast } from "@/components/ui/Toast";
import { printHtmlDocument } from "@/lib/printUtils";
import PrintPdfButton from "@/components/shared/PrintPdfButton";

interface EstimateItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export default function ClientEstimateDetailsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const estimateId = params.estimateId as string;
  const { showToast, ToastComponent } = useToast();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{
    id: string;
    name: string;
    number: string;
    clientName: string;
    contractNumber: string;
    date: string;
    status: string;
  } | null>(null);
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    item: EstimateItem;
    index: number;
  } | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    quantity: 0,
    unit: "",
    unitPrice: 0,
  });
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const boqItems = await employerBoqService.list(buildingId);
        const mappedItems: EstimateItem[] = boqItems.map((item) => ({
          id: item.itemCode,
          name: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          total: item.totalValue,
        }));
        setItems(mappedItems);
        setEstimate({
          id: estimateId,
          name: isArabic ? "مقايسة جهة الإسناد" : "Client Estimate",
          number: estimateId,
          clientName: "—",
          contractNumber: "—",
          date: new Date().toISOString().split("T")[0],
          status: "pending",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load estimate");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [buildingId, estimateId, isArabic]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-light flex items-center justify-center">
        <DataLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-danger">
          {isArabic ? "حدث خطأ في تحميل المقايسة" : "Error loading estimate"}
        </p>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">
          {isArabic ? "المقايسة غير موجودة" : "Estimate not found"}
        </p>
      </div>
    );
  }

  // ✅ لو مش mounted، ارجع loading
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-light flex items-center justify-center">
        <DataLoader />
      </div>
    );
  }

  const handlePrint = (logoUrl?: string) => {
    const itemsHtml = items
      .map(
        (item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="text-align:right">${item.name || "—"}</td>
          <td>${item.unit || "—"}</td>
          <td>${item.quantity?.toLocaleString() || 0}</td>
          <td>${item.unitPrice?.toLocaleString() || 0}</td>
          <td style="font-weight:700;color:#c9a03d;">${
            item.total?.toLocaleString() || 0
          }</td>
        </tr>
      `
      )
      .join("");

    const totalItems = items.reduce((sum, i) => sum + i.total, 0);

    const htmlContent = `
  <!DOCTYPE html>
  <html dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>${estimate.number}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Cairo', Arial, sans-serif; margin: 0; padding: 20px; background: white; color: #1e3a5f; }
      .print-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid #c9a03d; }
      .header h1 { font-size: 24px; font-weight: 900; color: #1e3a5f; margin: 0; }
      .header .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
      .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-right: 4px solid #c9a03d; }
      .info-item { display: flex; flex-direction: column; }
      .info-item .label { font-size: 11px; color: #999; font-weight: 600; }
      .info-item .value { font-size: 14px; font-weight: 700; color: #1e3a5f; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 15px 0 20px; }
      th { background-color: #1e3a5f; color: white; font-weight: 700; padding: 8px 6px; border: 1px solid #1e3a5f; text-align: center; }
      td { padding: 6px; border: 1px solid #ddd; text-align: center; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .total-row { font-weight: 700; background: #f2f2f2; }
      .total-row td { border-top: 2px solid #1e3a5f; }
      .text-gold { color: #c9a03d; }
      @media print { body { padding: 10px; } }
    </style>
  </head>
  <body>
    <div class="print-container">
      <div class="header">
        <h1>${estimate.name}</h1>
        <div class="subtitle">${estimate.number} | ${estimate.date} | ${
      estimate.clientName
    }</div>
      </div>

      <div class="info-grid">
        <div class="info-item"><span class="label">${
          isArabic ? "جهة الإسناد" : "Client"
        }</span><span class="value">${estimate.clientName}</span></div>
        <div class="info-item"><span class="label">${
          isArabic ? "رقم العقد" : "Contract No."
        }</span><span class="value">${
      estimate.contractNumber || "—"
    }</span></div>
        <div class="info-item"><span class="label">${
          isArabic ? "التاريخ" : "Date"
        }</span><span class="value">${estimate.date}</span></div>
        <div class="info-item"><span class="label">${
          isArabic ? "الحالة" : "Status"
        }</span><span class="value">${
      estimate.status === "approved"
        ? isArabic
          ? "معتمد"
          : "Approved"
        : isArabic
        ? "قيد الانتظار"
        : "Pending"
    }</span></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>م</th>
            <th style="text-align:right">${isArabic ? "اسم البند" : "Item"}</th>
            <th>${isArabic ? "الكمية" : "Qty"}</th>
            <th>${isArabic ? "الوحدة" : "Unit"}</th>
            <th>${isArabic ? "السعر" : "Price"}</th>
            <th>${isArabic ? "الإجمالي" : "Total"}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr class="total-row">
            <td colspan="5" style="text-align:left">${
              isArabic ? "الإجمالي الكلي" : "Grand Total"
            }</td>
            <td style="color:#c9a03d;font-size:16px;">${totalItems.toLocaleString()} ج.م</td>
          </tr>
        </tbody>
      </table>

      <div style="text-align:center;margin-top:30px;padding-top:15px;border-top:1px solid #eee;font-size:10px;color:#999">
      </div>
    </div>
  </body>
  </html>
  `;

    printHtmlDocument(
      isArabic ? "عرض سعر عميل" : "Client Estimate",
      htmlContent,
      `${estimate.number}.pdf`,
      { logoUrl }
    );
  };

  // ✅ تصدير Excel
  const exportToExcel = () => {
    if (items.length === 0) {
      showToast(
        isArabic ? "لا توجد بيانات للتصدير" : "No data to export",
        "error"
      );
      return;
    }
    const headers = ["م", "اسم البند", "الكمية", "الوحدة", "السعر", "الإجمالي"];
    const rows = items.map((item, idx) => [
      idx + 1,
      item.name,
      item.quantity,
      item.unit,
      item.unitPrice,
      item.total,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${estimate.number || "estimate"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  };

  const totalItems = items.reduce((sum, i) => sum + i.total, 0);

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemForm({ name: "", quantity: 0, unit: "", unitPrice: 0 });
    setShowItemModal(true);
  };

  const openEditItemModal = (item: EstimateItem, index: number) => {
    setEditingItem({ item, index });
    setItemForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
    });
    setShowItemModal(true);
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = itemForm.quantity * itemForm.unitPrice;
    const newItem: EstimateItem = {
      id: Date.now().toString(),
      name: itemForm.name,
      quantity: itemForm.quantity,
      unit: itemForm.unit,
      unitPrice: itemForm.unitPrice,
      total,
    };

    if (editingItem) {
      const newItems = [...items];
      newItems[editingItem.index] = newItem;
      setItems(newItems);
    } else {
      setItems([...items, newItem]);
    }
    setShowItemModal(false);
    setEditingItem(null);
    setItemForm({ name: "", quantity: 0, unit: "", unitPrice: 0 });
    showToast(
      isArabic ? "تم حفظ البند بنجاح" : "Item saved successfully",
      "success"
    );
  };

  // حذف بند
  const deleteItem = (index: number) => {
    if (
      confirm(
        isArabic
          ? "هل أنت متأكد من حذف هذا البند؟"
          : "Are you sure you want to delete this item?"
      )
    ) {
      setItems(items.filter((_, i) => i !== index));
      showToast(
        isArabic ? "تم حذف البند بنجاح" : "Item deleted successfully",
        "success"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-light" suppressHydrationWarning>
      {ToastComponent}

      {/* Header */}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <BackButton
              fallbackHref={`/${locale}/projects/${projectId}/buildings/${buildingId}/estimates/client`}
            />
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {estimate.name}
              </h1>
              <p className="text-sm text-text-secondary">{estimate.number}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition text-sm font-medium"
            >
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <PrintPdfButton
              label={isArabic ? "طباعة PDF" : "Print PDF"}
              onPrint={handlePrint}
            />
          </div>
        </div>
      </div>

      {/* Content for Print */}
      <div ref={printRef} className="p-6">
        {/* Header Info */}
        <div className="bg-surface rounded-xl p-6 mb-6 shadow-sm">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-text-secondary">
                {isArabic ? "رقم المقايسة" : "Estimate Number"}
              </p>
              <p className="font-bold">{estimate.number}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">
                {isArabic ? "جهة الإسناد" : "Client"}
              </p>
              <p className="font-bold">{estimate.clientName}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">
                {isArabic ? "رقم العقد" : "Contract Number"}
              </p>
              <p className="font-bold">{estimate.contractNumber || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">
                {isArabic ? "التاريخ" : "Date"}
              </p>
              <p className="font-bold">{estimate.date}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">
                {isArabic ? "الحالة" : "Status"}
              </p>
              <p
                className={`font-bold ${
                  estimate.status === "approved"
                    ? "text-success-dark"
                    : "text-warning-dark"
                }`}
              >
                {estimate.status === "approved"
                  ? isArabic
                    ? "معتمد"
                    : "Approved"
                  : isArabic
                  ? "قيد الانتظار"
                  : "Pending"}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-bold text-primary">
              {isArabic ? "بنود المقايسة" : "Estimate Items"}
            </h2>
            <button
              onClick={openAddItemModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
            >
              <Plus size={18} />
              {isArabic ? "إضافة بند" : "Add Item"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="p-3 text-center">#</th>
                  <th className="p-3 text-right">
                    {isArabic ? "اسم البند" : "Item"}
                  </th>
                  <th className="p-3 text-center">
                    {isArabic ? "الكمية" : "Qty"}
                  </th>
                  <th className="p-3 text-center">
                    {isArabic ? "الوحدة" : "Unit"}
                  </th>
                  <th className="p-3 text-center">
                    {isArabic ? "السعر" : "Price"}
                  </th>
                  <th className="p-3 text-center">
                    {isArabic ? "الإجمالي" : "Total"}
                  </th>
                  <th className="p-3 text-center">
                    {isArabic ? "إجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-secondary">
                      {isArabic ? "لا توجد بنود" : "No items"}
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="border-t hover:bg-surface-secondary"
                    >
                      <td className="p-3 text-center">{idx + 1}</td>
                      <td className="p-3">{item.name}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-center">{item.unit}</td>
                      <td className="p-3 text-center">
                        {item.unitPrice.toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-center font-bold text-gold">
                        {item.total.toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditItemModal(item, idx)}
                            className="text-info hover:text-info-dark transition p-1"
                            title={isArabic ? "تعديل" : "Edit"}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => deleteItem(idx)}
                            className="text-danger hover:text-danger-dark transition p-1"
                            title={isArabic ? "حذف" : "Delete"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot className="bg-surface-secondary">
                  <tr className="border-t-2 border-primary">
                    <td
                      colSpan={5}
                      className="p-3 text-left font-bold text-primary"
                    >
                      {isArabic ? "الإجمالي الكلي" : "Grand Total"}
                    </td>
                    <td className="p-3 text-center font-bold text-gold text-lg">
                      {totalItems.toLocaleString()} ج.م
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {editingItem
                  ? isArabic
                    ? "تعديل بند"
                    : "Edit Item"
                  : isArabic
                  ? "إضافة بند جديد"
                  : "Add New Item"}
              </h2>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-text-muted hover:text-text-secondary transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "اسم البند" : "Item Name"}
                </label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder={isArabic ? "أدخل اسم البند" : "Enter item name"}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "الكمية" : "Quantity"}
                  </label>
                  <input
                    type="number"
                    value={itemForm.quantity ?? ""}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        quantity: Number(e.target.value),
                      })
                    }
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="0"
                    required
                    min="0"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "الوحدة" : "Unit"}
                  </label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, unit: e.target.value })
                    }
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder={isArabic ? "م³، م²، عدد" : "m³, m², pc"}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "السعر (ج.م)" : "Unit Price (EGP)"}
                </label>
                <input
                  type="number"
                  value={itemForm.unitPrice ?? ""}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      unitPrice: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="0"
                  required
                  min="0"
                  step="any"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition text-sm font-medium"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition text-sm font-medium"
                >
                  {isArabic ? "حفظ" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
