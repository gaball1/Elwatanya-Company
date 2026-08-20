/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import BoqPageHeader from "@/components/boq/BoqPageHeader";
import SignaturesSection from "@/components/boq/SignaturesSection";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { exportToCsv, printHtml } from "@/lib/documentUtils";
import { getDocSignatures, setDocSignatures } from "@/lib/signatures";
import type { EmployerBoqItem } from "@/types/boq";
import { employerBoqService } from "@/services/employerBoq.service";
import { analyticalBoqService } from "@/services/analyticalBoq.service";
import DataLoader from "@/components/shared/DataLoader";
import { finalBoqService } from "@/services/finalBoq.service";
import type { AnalyticalBoqItem } from "@/types/boq";
import { Can } from "@/components/Can";

export default function AnalyticalBoqPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const docKey = `analytical:${buildingId}`;
  const back = `/${locale}/projects/${projectId}/buildings/${buildingId}/estimates`;
  const { showToast, ToastComponent } = useToast();

  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<AnalyticalBoqItem[]>([]);
  const [employerItems, setEmployerItems] = useState<EmployerBoqItem[]>([]);
  const [sigs, setSigs] = useState(getDocSignatures(docKey));
  const [editItem, setEditItem] = useState<AnalyticalBoqItem | null>(null);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const data = await analyticalBoqService.list(buildingId);
      setItems(data);
    } catch (e) {
      console.error(e);
      showToast(
        isArabic ? "فشل تحميل المقايسة التحليلية" : "Failed to load analytical BOQ",
        "error"
      );
    }
  }, [buildingId, isArabic, showToast]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticalBoqService.list(buildingId).then(setItems).catch((e) => {
        console.error(e);
        showToast(isArabic ? "فشل تحميل المقايسة التحليلية" : "Failed to load analytical BOQ", "error");
      }),
      employerBoqService.list(buildingId).then(setEmployerItems).catch((e) => {
        console.error(e);
        showToast(isArabic ? "فشل تحميل بنود جهة الإسناد" : "Failed to load employer items", "error");
      }),
    ]).finally(() => setLoading(false));
  }, [buildingId, isArabic, showToast]);

  const filteredItems = items.filter(
    (item) =>
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const total = filteredItems.reduce((s, i) => s + i.totalValue, 0);

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const original = items.find((i) => i.itemCode === editItem.itemCode);
    const increased = original ? editItem.quantity > original.quantity : false;

    try {
      const updated = await analyticalBoqService.update(buildingId, editItem.itemCode, {
        quantity: editItem.quantity,
        unitPrice: editItem.unitPrice,
        description: editItem.description,
      });
      setEditItem(null);
      await loadItems();
      showToast(isArabic ? "تم التحديث" : "Updated", "success");
      if (increased) {
        try {
          const finalItems = await finalBoqService.list(buildingId);
          const finalItem = finalItems.find((f) => f.itemCode === editItem.itemCode);
          const remaining = finalItem?.remainingQuantity ?? 0;
          if (remaining > 0) {
            showToast(
              isArabic
                ? `مازال هناك كمية (${remaining}) في بند ${updated.itemCode} لم توزع`
                : `There is still quantity (${remaining}) in item ${updated.itemCode} not yet distributed`,
              "warning"
            );
          }
        } catch {
          // Reminder is best-effort; keep the success toast.
        }
      }
    } catch (e: any) {
      showToast(
        e?.message ||
          (isArabic ? "فشل التحديث" : "Update failed"),
        "error"
      );
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-light -m-6 flex items-center justify-center">
        <DataLoader />
      </div>
    );
  }

  const handleImport = async (itemCode: string) => {
    try {
      await analyticalBoqService.importFromEmployer(buildingId, itemCode);
      await loadItems();
      showToast(
        isArabic
          ? `تم استيراد البند ${itemCode}`
          : `Imported item ${itemCode}`,
        "success"
      );
    } catch (err: any) {
      if (err?.status === 409) {
        const existingItem = employerItems.find((e) => e.itemCode === itemCode);
        showToast(
          isArabic
            ? `البند "${existingItem?.description}" موجود بالفعل في التحليلية`
            : `Item "${existingItem?.description}" already exists in analytical`,
          "error"
        );
      } else {
        showToast(
          isArabic ? "فشل الاستيراد" : "Import failed",
          "error"
        );
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteCode) return;
    try {
      await analyticalBoqService.remove(buildingId, deleteCode);
      setDeleteCode(null);
      await loadItems();
      showToast(isArabic ? "تم الحذف" : "Deleted", "success");
    } catch (err: any) {
      if (err?.status === 404) {
        showToast(isArabic ? "البند غير موجود" : "Item not found", "error");
      } else {
        showToast(isArabic ? "فشل الحذف" : "Delete failed", "error");
      }
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
        onPrint={(logoUrl) =>
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
            </tbody></table>`,
            "",
            { logoUrl }
          )
        }
      />
      <div className="px-6 pb-6">
        {/* ✅ Search Bar */}
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

        {/* ✅ استيراد من جهة الإسناد */}
        <div className="bg-surface rounded-xl p-4 mb-4 shadow-sm">
          <p className="text-sm text-text-secondary mb-2">
            {isArabic ? "استيراد من جهة الإسناد" : "Import from employer"}
          </p>
          <div className="flex flex-wrap gap-2">
            {employerItems.length === 0 ? (
              <span className="text-sm text-text-muted">
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
                  <Can key={e.itemCode} permission="analytical-boq.create">
                    <button
                      onClick={() => handleImport(e.itemCode)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gold text-gold rounded-lg text-sm hover:bg-gold hover:text-white transition"
                    >
                      <Plus size={14} /> {e.itemCode}
                    </button>
                  </Can>
                ))
            )}
          </div>
          {/* ✅ عرض البنود المستوردة والغير مستوردة */}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
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
        <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary">
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
                  <td colSpan={8} className="p-8 text-center text-text-secondary">
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
                  <tr key={item.itemCode} className="border-t hover:bg-surface-secondary">
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
                        <Can permission="analytical-boq.update">
                          <button
                            onClick={() => setEditItem({ ...item })}
                            className="text-info hover:text-info-dark"
                            title={isArabic ? "تعديل" : "Edit"}
                          >
                            <Edit2 size={18} />
                          </button>
                        </Can>
                        <Can permission="analytical-boq.delete">
                          <button
                            onClick={() => setDeleteCode(item.itemCode)}
                            className="text-danger hover:text-danger-dark"
                            title={isArabic ? "حذف" : "Delete"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredItems.length > 0 && (
              <tfoot className="bg-surface-secondary">
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
            className="bg-surface rounded-2xl w-full max-w-md p-5 space-y-3"
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-primary">{editItem.itemCode}</h2>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="text-text-muted hover:text-text-secondary"
              >
                <X size={24} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {isArabic ? "البيان" : "Description"}
              </label>
              <input
                value={editItem.description}
                onChange={(e) =>
                  setEditItem({ ...editItem, description: e.target.value })
                }
                className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
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
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  min={0}
                  step="any"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
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
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  min={0}
                  step="any"
                />
              </div>
            </div>

            <div className="bg-surface-secondary p-3 rounded-lg">
              <p className="text-sm text-text-secondary">
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
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}