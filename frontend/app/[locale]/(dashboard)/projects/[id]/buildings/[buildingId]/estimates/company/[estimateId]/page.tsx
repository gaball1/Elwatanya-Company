/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useRef } from "react";
import { Card } from "@/components/ui";
import { Plus, Edit2, Trash2, X, Printer, Send, Download } from "lucide-react";
import { mockCompanyEstimates } from "@/lib/mockData";
import BackButton from "@/components/shared/BackButton";
import { useToast } from "@/components/ui/Toast";

// تعريف نوع البند
interface EstimateItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export default function CompanyEstimateDetailsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const estimateId = params.estimateId as string;
  const { showToast, ToastComponent } = useToast();

  const [estimate, setEstimate] = useState(
    mockCompanyEstimates.find((e) => e.id === estimateId)
  );
  const [items, setItems] = useState<EstimateItem[]>(estimate?.items || []);
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

  if (!estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          {isArabic ? "المقايسة غير موجودة" : "Estimate not found"}
        </p>
      </div>
    );
  }

  // ✅ طباعة PDF
  const handlePrint = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

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
        ${
          isArabic
            ? "تم إنشاء هذا التقرير بواسطة الشركة - الوطنية للتنمية العمرانية"
            : "Generated automatically - Al-Wataniya Urban Development"
        }
      </div>
    </div>
  </body>
  </html>
  `;

    iframe.srcdoc = htmlContent;
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    };
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
  const isPending = estimate.status === "pending";

  const handleSendForApproval = () => {
    setEstimate({ ...estimate, status: "pending" });
    showToast(
      isArabic
        ? "تم إرسال المقايسة للمدير للموافقة"
        : "Estimate sent to manager for approval",
      "success"
    );
  };

  // فتح إضافة بند جديد
  const openAddItemModal = () => {
    setEditingItem(null);
    setItemForm({ name: "", quantity: 0, unit: "", unitPrice: 0 });
    setShowItemModal(true);
  };

  // فتح تعديل بند
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

  // حفظ بند (جديد أو معدل)
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
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}

      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <BackButton
              fallbackHref={`/${locale}/projects/${projectId}/buildings/${buildingId}/estimates/company`}
            />
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {estimate.name}
              </h1>
              <p className="text-sm text-gray-500">{estimate.number}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!isPending && (
              <button
                onClick={handleSendForApproval}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold/80 transition text-sm font-medium"
              >
                <Send size={18} />{" "}
                {isArabic ? "إرسال للموافقة" : "Send for Approval"}
              </button>
            )}
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition text-sm font-medium"
            >
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
            >
              <Printer size={18} /> {isArabic ? "طباعة PDF" : "Print PDF"}
            </button>
          </div>
        </div>
      </div>

      <div ref={printRef} className="p-6">
        {/* معلومات المقايسة */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">
                {isArabic ? "رقم المقايسة" : "Estimate Number"}
              </p>
              <p className="font-bold">{estimate.number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {isArabic ? "جهة الإسناد" : "Client"}
              </p>
              <p className="font-bold">{estimate.clientName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {isArabic ? "رقم العقد" : "Contract Number"}
              </p>
              <p className="font-bold">{estimate.contractNumber || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {isArabic ? "التاريخ" : "Date"}
              </p>
              <p className="font-bold">{estimate.date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {isArabic ? "الحالة" : "Status"}
              </p>
              <p
                className={`font-bold ${
                  estimate.status === "approved"
                    ? "text-green-600"
                    : "text-yellow-600"
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

        {/* جدول البنود */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
              <thead className="bg-gray-50">
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
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      {isArabic ? "لا توجد بنود" : "No items"}
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.id} className="border-t hover:bg-gray-50">
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
                            className="text-blue-500 hover:text-blue-700 transition p-1"
                            title={isArabic ? "تعديل" : "Edit"}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => deleteItem(idx)}
                            className="text-red-500 hover:text-red-700 transition p-1"
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
                <tfoot className="bg-gray-50">
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
          <div className="bg-white rounded-2xl w-full max-w-md">
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
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleItemSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "اسم البند" : "Item Name"}
                </label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder={isArabic ? "أدخل اسم البند" : "Enter item name"}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "الكمية" : "Quantity"}
                  </label>
                  <input
                    type="number"
                    value={itemForm.quantity || ""}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        quantity: Number(e.target.value),
                      })
                    }
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="0"
                    required
                    min="0"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "الوحدة" : "Unit"}
                  </label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, unit: e.target.value })
                    }
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder={isArabic ? "م³، م²، عدد" : "m³, m², pc"}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "السعر (ج.م)" : "Unit Price (EGP)"}
                </label>
                <input
                  type="number"
                  value={itemForm.unitPrice || ""}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      unitPrice: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm font-medium"
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
