/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import BoqPageHeader from "@/components/boq/BoqPageHeader";
import SignaturesSection from "@/components/boq/SignaturesSection";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { exportToCsv, printHtml } from "@/lib/documentUtils";
import {
  getEmployerItems,
  getDocSignatures,
  setDocSignatures,
  setEmployerItems,
  upsertEmployerItem,
} from "@/lib/boqStore";
import type { EmployerBoqItem } from "@/types/boq";

export default function EmployerBoqPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const docKey = `employer:${buildingId}`;
  const back = `/${locale}/projects/${projectId}/buildings/${buildingId}/estimates`;
  const { showToast, ToastComponent } = useToast();
  const [, refresh] = useState(0);
  
  // ✅ منع Hydration Error
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const items = getEmployerItems(buildingId);
  const [sigs, setSigs] = useState(getDocSignatures(docKey));
  const [showModal, setShowModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EmployerBoqItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // ✅ الفورم - من غير itemCode
  const [form, setForm] = useState({
    description: "",
    unit: "م³",
    quantity: 0,
    unitPrice: 0,
  });

  // ✅ فلترة البنود حسب البحث
  const filteredItems = items.filter(
    (item) =>
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const total = filteredItems.reduce((s, i) => s + i.totalValue, 0);
  const bump = () => refresh((n) => n + 1);

  const openAdd = () => {
    setEditingItem(null);
    setForm({
      description: "",
      unit: "م³",
      quantity: 0,
      unitPrice: 0,
    });
    setShowModal(true);
  };

  const openEdit = (item: EmployerBoqItem) => {
    setEditingItem(item);
    setForm({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    });
    setShowModal(true);
  };

  const saveItem = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.description) {
      showToast(
        isArabic ? "يرجى إدخال وصف البند" : "Please enter item description",
        "error"
      );
      return;
    }

    // ✅ upsertEmployerItem هيتعامل مع الإضافة والتعديل
    // ✅ itemCode مش موجود، هيتولد تلقائياً
    upsertEmployerItem(buildingId, {
      description: form.description,
      unit: form.unit,
      quantity: form.quantity,
      unitPrice: form.unitPrice,
      totalValue: form.quantity * form.unitPrice,
    });
    
    setShowModal(false);
    bump();
    showToast(isArabic ? "تم الحفظ" : "Saved", "success");
  };

  const confirmDelete = () => {
    if (!deleteCode) return;
    setEmployerItems(
      buildingId,
      items.filter((i) => i.itemCode !== deleteCode)
    );
    setDeleteCode(null);
    bump();
    showToast(isArabic ? "تم الحذف" : "Deleted", "success");
  };

  const handleExport = () => {
    if (!filteredItems.length)
      return showToast(isArabic ? "لا توجد بيانات" : "No data", "error");
    exportToCsv(
      "employer-boq.csv",
      ["م", "كود", "البند", "الوحدة", "الكمية", "الفئة", "القيمة"],
      filteredItems.map((i, idx) => [
        idx + 1,
        i.itemCode,
        i.description,
        i.unit,
        i.quantity,
        i.unitPrice,
        i.totalValue,
      ])
    );
    showToast(isArabic ? "تم التصدير" : "Exported", "success");
  };

  const handlePrint = () => {
    const rows = filteredItems
      .map(
        (i, idx) =>
          `<tr><td>${idx + 1}</td><td>${
            i.itemCode
          }</td><td style="text-align:right">${i.description}</td><td>${
            i.unit
          }</td><td>${i.quantity}</td><td>${
            i.unitPrice
          }</td><td class="gold">${i.totalValue.toLocaleString()}</td></tr>`
      )
      .join("");
    printHtml(
      isArabic ? "مقايسة جهة الإسناد" : "Employer BOQ",
      `<div class="header"><h1>${
        isArabic ? "مقايسة جهة الإسناد" : "Employer BOQ"
      }</h1></div>
      <table><thead><tr><th>م</th><th>كود</th><th>البند</th><th>وحدة</th><th>كمية</th><th>فئة</th><th>قيمة</th></tr></thead><tbody>${rows}
      <tr><td colspan="6" style="text-align:left;font-weight:700">الإجمالي</td><td class="gold">${total.toLocaleString()}</td></tr></tbody></table>`
    );
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
        title={isArabic ? "مقايسة جهة الإسناد" : "Employer BOQ"}
        subtitle={isArabic ? "المصدر الرئيسي للبنود" : "Main BOQ source"}
        fallbackHref={back}
        isArabic={isArabic}
        onPrint={handlePrint}
        onExport={handleExport}
      />
      <div className="px-6 pb-6">
        {/* ✅ Search Bar */}
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

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-bold text-primary">
              {isArabic ? "بنود المقايسة" : "BOQ Items"}
            </h2>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              <Plus size={18} /> {isArabic ? "إضافة بند" : "Add Item"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">{isArabic ? "كود" : "Code"}</th>
                  <th className="p-3 text-right">
                    {isArabic ? "البند" : "Item"}
                  </th>
                  <th className="p-3">{isArabic ? "وحدة" : "Unit"}</th>
                  <th className="p-3">{isArabic ? "كمية" : "Qty"}</th>
                  <th className="p-3">{isArabic ? "فئة" : "Price"}</th>
                  <th className="p-3">{isArabic ? "قيمة" : "Value"}</th>
                  <th className="p-3">{isArabic ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
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
                    <tr
                      key={item.itemCode}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="p-3 text-center">{idx + 1}</td>
                      <td className="p-3 text-center font-mono">
                        {item.itemCode}
                      </td>
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-center">{item.unit}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-center">
                        {item.unitPrice.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-bold text-gold">
                        {item.totalValue.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => setDeleteCode(item.itemCode)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr className="border-t-2 border-primary">
                    <td colSpan={6} className="p-3 font-bold text-primary">
                      {isArabic ? "الإجمالي" : "Total"}
                    </td>
                    <td className="p-3 text-center font-bold text-gold text-lg">
                      {total.toLocaleString()} ج.م
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        <SignaturesSection
          isArabic={isArabic}
          signatures={sigs}
          onChange={(next) => {
            setSigs(next);
            setDocSignatures(docKey, next);
          }}
        />
      </div>

      {/* ✅ مودال الإضافة/التعديل - من غير حقل الكود */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex justify-between p-5 border-b">
              <h2 className="font-bold text-primary">
                {editingItem
                  ? isArabic
                    ? "تعديل بند"
                    : "Edit Item"
                  : isArabic
                  ? "إضافة بند"
                  : "Add Item"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={saveItem} className="p-5 space-y-3">
              {/* ✅ رسوم توضيحية بدل حقل الكود */}
              <div className="bg-gray-50 p-3 rounded-lg text-center text-sm text-gray-500">
                {isArabic 
                  ? "📌 سيتم إنشاء كود تلقائي للبند" 
                  : "📌 Item code will be generated automatically"}
              </div>
              
              <input
                required
                placeholder={isArabic ? "الوصف" : "Description"}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full p-3 border rounded-xl"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  required
                  placeholder={isArabic ? "وحدة" : "Unit"}
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="p-3 border rounded-xl"
                />
                <input
                  required
                  type="number"
                  placeholder={isArabic ? "كمية" : "Qty"}
                  value={form.quantity || ""}
                  onChange={(e) =>
                    setForm({ ...form, quantity: Number(e.target.value) })
                  }
                  className="p-3 border rounded-xl"
                />
                <input
                  required
                  type="number"
                  placeholder={isArabic ? "فئة" : "Price"}
                  value={form.unitPrice || ""}
                  onChange={(e) =>
                    setForm({ ...form, unitPrice: Number(e.target.value) })
                  }
                  className="p-3 border rounded-xl"
                />
              </div>
              
              {/* ✅ عرض القيمة الإجمالية */}
              <div className="bg-gray-50 p-2 rounded-lg text-center text-sm">
                <span className="text-gray-600">
                  {isArabic ? "القيمة الإجمالية:" : "Total Value:"}
                </span>
                <span className="font-bold text-gold mr-2">
                  {(form.quantity * form.unitPrice).toLocaleString()} ج.م
                </span>
              </div>
              
              <button
                type="submit"
                className="w-full py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition"
              >
                {isArabic ? "حفظ" : "Save"}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {deleteCode && (
        <DeleteConfirmModal
          isArabic={isArabic}
          message={isArabic ? "هل تريد حذف هذا البند؟" : "Delete this item?"}
          onCancel={() => setDeleteCode(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}