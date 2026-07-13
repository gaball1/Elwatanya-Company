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
  getAnalyticalItems,
  getEmployerItems,
  getDocSignatures,
  importAnalyticalFromEmployer,
  removeAnalyticalItem,
  setAnalyticalItems,
  setDocSignatures,
  updateAnalyticalItem,
} from "@/lib/boqStore";
import type { AnalyticalBoqItem } from "@/types/boq";

export default function AnalyticalBoqPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const docKey = `analytical:${buildingId}`;
  const back = `/${locale}/projects/${projectId}/buildings/${buildingId}/estimates`;
  const { showToast, ToastComponent } = useToast();
  const [, refresh] = useState(0);

  // ✅ منع Hydration Error
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const employerItems = getEmployerItems(buildingId);
  const items = getAnalyticalItems(buildingId);
  const [sigs, setSigs] = useState(getDocSignatures(docKey));
  const [editItem, setEditItem] = useState<AnalyticalBoqItem | null>(null);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const bump = () => refresh((n) => n + 1);

  // ✅ فلترة البنود حسب البحث
  const filteredItems = items.filter(
    (item) =>
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const total = filteredItems.reduce((s, i) => s + i.totalValue, 0);

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const result = updateAnalyticalItem(buildingId, editItem.itemCode, {
      quantity: editItem.quantity,
      unitPrice: editItem.unitPrice,
      description: editItem.description,
    });

    if (result) {
      setEditItem(null);
      bump();
      showToast(isArabic ? "تم التحديث" : "Updated", "success");
    } else {
      showToast(isArabic ? "فشل التحديث" : "Update failed", "error");
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

  // ✅ دالة الاستيراد مع منع التكرار
  const handleImport = (itemCode: string) => {
    const result = importAnalyticalFromEmployer(buildingId, itemCode);
    if (result) {
      bump();
      showToast(
        isArabic
          ? `تم استيراد البند ${itemCode}`
          : `Imported item ${itemCode}`,
        "success"
      );
    } else {
      // ✅ البند موجود بالفعل
      const existingItem = employerItems.find((e) => e.itemCode === itemCode);
      showToast(
        isArabic
          ? `البند "${existingItem?.description}" موجود بالفعل في التحليلية`
          : `Item "${existingItem?.description}" already exists in analytical`,
        "error"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-light -m-6" suppressHydrationWarning>
      {ToastComponent}
      <BoqPageHeader
        title={isArabic ? "المقايسة التحليلية" : "Analytical BOQ"}
        fallbackHref={back}
        isArabic={isArabic}
        onExport={() => {
          exportToCsv(
            "analytical-boq.csv",
            ["كود", "بيان", "وحدة", "كمية", "فئة", "قيمة"],
            filteredItems.map((i) => [
              i.itemCode,
              i.description,
              i.unit,
              i.quantity,
              i.unitPrice,
              i.totalValue,
            ])
          );
          showToast(isArabic ? "تم التصدير" : "Exported", "success");
        }}
        onPrint={() =>
          printHtml(
            isArabic ? "المقايسة التحليلية" : "Analytical BOQ",
            `<div class="header"><h1>${
              isArabic ? "المقايسة التحليلية" : "Analytical BOQ"
            }</h1></div>
            <table><thead><tr><th>كود</th><th>بيان</th><th>وحدة</th><th>كمية</th><th>فئة</th><th>قيمة</th></tr></thead><tbody>
            ${filteredItems
              .map(
                (i) =>
                  `<tr><td>${i.itemCode}</td><td>${i.description}</td><td>${i.unit}</td><td>${i.quantity}</td><td>${i.unitPrice}</td><td>${i.totalValue}</td></tr>`
              )
              .join("")}
            </tbody></table>`
          )
        }
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

        {/* ✅ استيراد من جهة الإسناد */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">
            {isArabic ? "استيراد من جهة الإسناد" : "Import from employer"}
          </p>
          <div className="flex flex-wrap gap-2">
            {employerItems.length === 0 ? (
              <span className="text-sm text-gray-400">
                {isArabic
                  ? "لا توجد بنود في جهة الإسناد"
                  : "No items in employer BOQ"}
              </span>
            ) : (
              // ✅ فلترة البنود غير المستوردة (باستخدام description و unit)
              employerItems
                .filter(
                  (e) =>
                    !items.some(
                      (a) => a.description === e.description && a.unit === e.unit
                    )
                )
                .map((e) => (
                  <button
                    key={e.itemCode}
                    onClick={() => handleImport(e.itemCode)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gold text-gold rounded-lg text-sm hover:bg-gold hover:text-white transition"
                  >
                    <Plus size={14} /> {e.itemCode}
                  </button>
                ))
            )}
          </div>
          {/* ✅ عرض البنود المستوردة والغير مستوردة */}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
            {items.length > 0 && (
              <span>
                {isArabic
                  ? `✅ تم استيراد ${items.length} بند`
                  : `✅ ${items.length} items imported`}
              </span>
            )}
            {employerItems.length > 0 && (
              <span>
                {isArabic
                  ? `📦 إجمالي ${employerItems.length} بند في جهة الإسناد`
                  : `📦 ${employerItems.length} items in employer BOQ`}
              </span>
            )}
            {employerItems.length > items.length && (
              <span className="text-gold">
                {isArabic
                  ? `⬅️ ${employerItems.length - items.length} بند متاح للاستيراد`
                  : `⬅️ ${employerItems.length - items.length} items available to import`}
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
                <th className="p-3">فئة</th>
                <th className="p-3">قيمة</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    {isArabic
                      ? searchTerm
                        ? "لا توجد نتائج للبحث"
                        : "لا توجد بنود - استورد من جهة الإسناد"
                      : searchTerm
                      ? "No search results"
                      : "No items - import from employer"}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.itemCode} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-center">{idx + 1}</td>
                    <td className="p-3 font-mono">{item.itemCode}</td>
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
                          onClick={() => setEditItem({ ...item })}
                          className="text-blue-500 hover:text-blue-700"
                          title={isArabic ? "تعديل" : "Edit"}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteCode(item.itemCode)}
                          className="text-red-500 hover:text-red-700"
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
            {filteredItems.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr className="border-t-2 border-primary">
                  <td colSpan={6} className="p-3 font-bold text-primary">
                    {isArabic ? "الإجمالي" : "Total"}
                  </td>
                  <td className="p-3 text-center font-bold text-gold">
                    {total.toLocaleString()} ج.م
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
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

      {/* ✅ مودال التعديل مع الكمية والسعر */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={saveEdit}
            className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3"
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-primary">{editItem.itemCode}</h2>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isArabic ? "البيان" : "Description"}
              </label>
              <input
                value={editItem.description}
                onChange={(e) =>
                  setEditItem({ ...editItem, description: e.target.value })
                }
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "الكمية" : "Quantity"}
                </label>
                <input
                  type="number"
                  value={editItem.quantity}
                  onChange={(e) =>
                    setEditItem({
                      ...editItem,
                      quantity: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  min={0}
                  step="any"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "السعر" : "Unit Price"}
                </label>
                <input
                  type="number"
                  value={editItem.unitPrice}
                  onChange={(e) =>
                    setEditItem({
                      ...editItem,
                      unitPrice: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  min={0}
                  step="any"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                {isArabic ? "القيمة الإجمالية:" : "Total Value:"}{" "}
                <span className="font-bold text-gold">
                  {(editItem.quantity * editItem.unitPrice).toLocaleString()}{" "}
                  ج.م
                </span>
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition"
            >
              {isArabic ? "حفظ" : "Save"}
            </button>
          </form>
        </div>
      )}

      {deleteCode && (
        <DeleteConfirmModal
          isArabic={isArabic}
          message={isArabic ? "حذف البند؟" : "Delete item?"}
          onCancel={() => setDeleteCode(null)}
          onConfirm={() => {
            removeAnalyticalItem(buildingId, deleteCode);
            setDeleteCode(null);
            bump();
          }}
        />
      )}
    </div>
  );
}