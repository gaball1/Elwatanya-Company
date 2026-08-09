/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit2, Trash2, X, Search, Upload } from "lucide-react";
import BoqPageHeader from "@/components/boq/BoqPageHeader";
import SignaturesSection from "@/components/boq/SignaturesSection";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { exportToCsv, printHtml } from "@/lib/documentUtils";
import { getDocSignatures, setDocSignatures } from "@/lib/boqStore";
import { employerBoqService } from "@/services/employerBoq.service";
import type { EmployerBoqItem } from "@/types/boq";
import { parseBoqExcelFile, exportBoqToExcel } from "@/lib/boqExcel";
import { Can } from "@/components/Can";

const PAGE_SIZE = 50;

export default function EmployerBoqPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const docKey = `employer:${buildingId}`;
  const back = `/${locale}/projects/${projectId}/buildings/${buildingId}/estimates`;
  const { showToast, ToastComponent } = useToast();

  const [mounted, setMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [items, setItems] = useState<EmployerBoqItem[]>([]);
  const [sigs, setSigs] = useState<Array<{ id: string; name: string; title: string; date: string }>>([]);

  const [showModal, setShowModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EmployerBoqItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    description: "",
    unit: "م³",
    quantity: 0,
    unitPrice: 0,
  });

  const safeNumber = (n: number | undefined | null): number => (Number.isFinite(n) ? (n as number) : 0);

  const loadItems = useCallback(async () => {
    if (!buildingId) return;
    try {
      const data = await employerBoqService.list(buildingId);
      setItems(data);
      setPage(1);
    } catch (e) {
      console.error(e);
      showToast(isArabic ? "فشل تحميل البنود" : "Failed to load items", "error");
    } finally {
      setInitialLoading(false);
    }
  }, [buildingId, isArabic, showToast]);

  useEffect(() => {
    setMounted(true);
    if (!buildingId) return;
    loadItems();
    setSigs(getDocSignatures(docKey));
  }, [loadItems, docKey, buildingId]);

  const filteredItems = useMemo(
    () => {
      const q = searchTerm.trim().toLowerCase();
      const min = minPrice === "" ? null : Number(minPrice);
      const max = maxPrice === "" ? null : Number(maxPrice);
      return items.filter((item) => {
        if (q && !(item.itemCode ?? "").toLowerCase().includes(q) && !(item.description ?? "").toLowerCase().includes(q)) {
          return false;
        }
        if (unitFilter && item.unit !== unitFilter) {
          return false;
        }
        const price = safeNumber(item.unitPrice);
        if (min !== null && price < min) return false;
        if (max !== null && price > max) return false;
        return true;
      });
    },
    [items, searchTerm, unitFilter, minPrice, maxPrice]
  );

  const units = useMemo(
    () => Array.from(new Set(items.map((i) => i.unit).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const total = filteredItems.reduce((s, i) => s + (i.totalValue ?? 0), 0);

  const openAdd = () => {
    setSaving(false);
    setEditingItem(null);
    setForm({ description: "", unit: "م³", quantity: 0, unitPrice: 0 });
    setShowModal(true);
  };

  const openEdit = (item: EmployerBoqItem) => {
    setSaving(false);
    setEditingItem(item);
    setForm({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    });
    setShowModal(true);
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      showToast(isArabic ? "يرجى إدخال وصف البند" : "Please enter item description", "error");
      return;
    }
    if (!form.unit.trim()) {
      showToast(isArabic ? "يرجى إدخال الوحدة" : "Please enter unit", "error");
      return;
    }
    if (!Number.isFinite(form.quantity) || form.quantity < 0) {
      showToast(isArabic ? "الكمية يجب أن تكون رقماً موجباً" : "Quantity must be a non-negative number", "error");
      return;
    }
    if (!Number.isFinite(form.unitPrice) || form.unitPrice < 0) {
      showToast(isArabic ? "السعر يجب أن يكون رقماً موجباً" : "Unit price must be a non-negative number", "error");
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      await employerBoqService.upsert(buildingId, {
        itemCode: editingItem?.itemCode,
        description: form.description.trim(),
        unit: form.unit.trim(),
        quantity: form.quantity,
        unitPrice: form.unitPrice,
      });
      await loadItems();
      setShowModal(false);
      showToast(isArabic ? "تم الحفظ" : "Saved", "success");
    } catch (e: any) {
      console.error(e);
      if (e?.status === 409) {
        showToast(
          isArabic ? "كود البند مكرر - استخدم كوداً مختلفاً" : "Duplicate item code - use a different code",
          "error"
        );
      } else {
        showToast(isArabic ? "فشل الحفظ" : "Failed to save", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCode) return;
    if (deleting) return;
    setDeleting(true);
    try {
      await employerBoqService.remove(buildingId, deleteCode);
      setDeleteCode(null);
      await loadItems();
      showToast(isArabic ? "تم الحذف" : "Deleted", "success");
    } catch (e: any) {
      console.error(e);
      if (e?.status === 404) {
        showToast(isArabic ? "البند غير موجود" : "Item not found", "error");
      } else {
        showToast(isArabic ? "فشل الحذف" : "Failed to delete", "error");
      }
    } finally {
      setDeleting(false);
    }
  };

  const parseCsv = (text: string): Array<{ description: string; unit: string; quantity: number; unitPrice: number }> => {
    const rows: Array<{ description: string; unit: string; quantity: number; unitPrice: number }> = [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parseLine = (line: string) => {
      const parts: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === "," && !inQuotes) {
          parts.push(current.trim());
          current = "";
        } else current += ch;
      }
      parts.push(current.trim());
      return parts.map((p) => p.replace(/^"|"$/g, ""));
    };

    for (const line of lines) {
      const cols = parseLine(line);
      if (cols.length < 2) continue;
      const description = cols[0];
      const unit = cols[1] || "م³";
      const quantity = Number(cols[2]);
      const unitPrice = Number(cols[3]);
      if (!description) continue;
      rows.push({
        description,
        unit,
        quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
        unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
      });
    }
    return rows;
  };

  const handleImportFile = async (file: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        showToast(
          isArabic ? "لا توجد بيانات صالحة في الملف (العمود الأول: الوصف)" : "No valid rows in file (first column: description)",
          "error"
        );
        return;
      }
      for (const row of rows) {
        await employerBoqService.upsert(buildingId, row);
      }
      await loadItems();
      showToast(
        isArabic ? `تم استيراد ${rows.length} بند` : `Imported ${rows.length} items`,
        "success"
      );
    } catch (e) {
      console.error(e);
      showToast(isArabic ? "فشل استيراد الملف" : "Import failed", "error");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImportExcel = async (file: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const rows = await parseBoqExcelFile(file);
      if (rows.length === 0) {
        showToast(
          isArabic ? "لا توجد بيانات صالحة في الملف" : "No valid rows in file",
          "error"
        );
        return;
      }
      for (const row of rows) {
        await employerBoqService.upsert(buildingId, row);
      }
      await loadItems();
      showToast(
        isArabic ? `تم استيراد ${rows.length} بند من Excel` : `Imported ${rows.length} items from Excel`,
        "success"
      );
    } catch (e) {
      console.error(e);
      showToast(isArabic ? "فشل استيراد ملف Excel" : "Excel import failed", "error");
    } finally {
      setImporting(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const handleExport = async (format: "csv" | "excel") => {
    if (!filteredItems.length) return showToast(isArabic ? "لا توجد بيانات" : "No data", "error");
    if (format === "excel") {
      try {
        await exportBoqToExcel(
          filteredItems.map((i) => ({
            itemCode: i.itemCode,
            description: i.description,
            unit: i.unit,
            quantity: safeNumber(i.quantity),
            unitPrice: safeNumber(i.unitPrice),
            totalValue: safeNumber(i.totalValue),
          })),
          "employer-boq.xlsx",
          ["Code", "Description", "Unit", "Quantity", "Unit Price", "Total Value"]
        );
        showToast(isArabic ? "تم تصدير Excel" : "Excel exported", "success");
      } catch (e) {
        console.error(e);
        showToast(isArabic ? "فشل تصدير Excel" : "Excel export failed", "error");
      }
      return;
    }
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
        i.totalValue ?? 0,
      ])
    );
    showToast(isArabic ? "تم التصدير" : "Exported", "success");
  };

  const handlePrint = () => {
    const rows = filteredItems
      .map(
        (i, idx) =>
          `<tr><td>${idx + 1}</td><td>${i.itemCode}</td><td style="text-align:right">${i.description}</td><td>${i.unit}</td><td>${i.quantity}</td><td>${i.unitPrice}</td><td class="gold">${(i.totalValue ?? 0).toLocaleString()}</td></tr>`
      )
      .join("");
    printHtml(
      isArabic ? "مقايسة جهة الإسناد" : "Employer BOQ",
      `<div class="header"><h1>${isArabic ? "مقايسة جهة الإسناد" : "Employer BOQ"}</h1></div>
      <table><thead><tr><th>م</th><th>كود</th><th>البند</th><th>وحدة</th><th>كمية</th><th>فئة</th><th>قيمة</th></tr></thead><tbody>${rows}
      <tr><td colspan="6" style="text-align:left;font-weight:700">الإجمالي</td><td class="gold">${(total ?? 0).toLocaleString()}</td></tr></tbody></table>`
    );
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-light -m-6 flex items-center justify-center">
        <div className="animate-pulse text-text-muted">
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
        onExport={() => handleExport("excel")}
      />
      <div className="px-6 pb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-md w-full">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
            <input
              type="text"
              placeholder={isArabic ? "بحث بالكود أو الوصف..." : "Search by code or description..."}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Can permission="employer-boq.read">
              <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => handleExport("csv")}
                  disabled={importing}
                  className="px-3 py-2 text-sm text-text-secondary hover:bg-surface-secondary transition disabled:opacity-50"
                  title={isArabic ? "تصدير CSV" : "Export CSV"}
                >
                  CSV
                </button>
                <span className="w-px h-4 bg-border" />
                <button
                  onClick={() => handleExport("excel")}
                  disabled={importing}
                  className="px-3 py-2 text-sm text-text-secondary hover:bg-surface-secondary transition disabled:opacity-50"
                  title={isArabic ? "تصدير Excel" : "Export Excel"}
                >
                  Excel
                </button>
              </div>
            </Can>
            <Can permission="employer-boq.create">
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFile(file);
                  }}
                />
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportExcel(file);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 border border-gold text-gold rounded-lg text-sm hover:bg-gold hover:text-white transition disabled:opacity-50"
                >
                  <Upload size={16} />
                  {importing
                    ? isArabic ? "جارٍ الاستيراد..." : "Importing..."
                    : isArabic ? "استيراد CSV" : "Import CSV"}
                </button>
                <button
                  onClick={() => excelInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 border border-gold text-gold rounded-lg text-sm hover:bg-gold hover:text-white transition disabled:opacity-50"
                >
                  <Upload size={16} />
                  {isArabic ? "استيراد Excel" : "Import Excel"}
                </button>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm"
                >
                  <Plus size={18} /> {isArabic ? "إضافة بند" : "Add Item"}
                </button>
              </>
            </Can>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={unitFilter}
            onChange={(e) => {
              setUnitFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gold bg-surface"
          >
            <option value="">
              {isArabic ? "كل الوحدات" : "All units"}
            </option>
            {units.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            step="any"
            placeholder={isArabic ? "الحد الأدنى للسعر" : "Min price"}
            value={minPrice === "" ? "" : minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value === "" ? "" : Number(e.target.value));
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gold"
          />
          <input
            type="number"
            min={0}
            step="any"
            placeholder={isArabic ? "الحد الأقصى للسعر" : "Max price"}
            value={maxPrice === "" ? "" : maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value === "" ? "" : Number(e.target.value));
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gold"
          />
        </div>

        <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-bold text-primary">
              {isArabic ? "بنود المقايسة" : "BOQ Items"}
              <span className="text-sm font-normal text-text-muted mr-2">
                ({filteredItems.length})
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">{isArabic ? "كود" : "Code"}</th>
                  <th className="p-3 text-right">{isArabic ? "البند" : "Item"}</th>
                  <th className="p-3">{isArabic ? "وحدة" : "Unit"}</th>
                  <th className="p-3">{isArabic ? "كمية" : "Qty"}</th>
                  <th className="p-3">{isArabic ? "فئة" : "Price"}</th>
                  <th className="p-3">{isArabic ? "قيمة" : "Value"}</th>
                  <th className="p-3">{isArabic ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {initialLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-secondary">
                      <div className="animate-pulse">{isArabic ? "جاري تحميل البنود..." : "Loading items..."}</div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-secondary">
                      {isArabic
                        ? searchTerm ? "لا توجد نتائج للبحث" : "لا توجد بنود - أضف بنداً أو استورد CSV"
                        : searchTerm ? "No search results" : "No items - add an item or import CSV"}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item, idx) => (
                    <tr key={item.itemCode} className="border-t hover:bg-surface-secondary">
                      <td className="p-3 text-center">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="p-3 text-center font-mono">{item.itemCode}</td>
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-center">{item.unit}</td>
                      <td className="p-3 text-center">{safeNumber(item.quantity)}</td>
                      <td className="p-3 text-center">{safeNumber(item.unitPrice).toLocaleString()}</td>
                      <td className="p-3 text-center font-bold text-gold">
                        {safeNumber(item.totalValue).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Can permission="employer-boq.update">
                            <button onClick={() => openEdit(item)} className="text-info hover:text-info-dark">
                              <Edit2 size={18} />
                            </button>
                          </Can>
                          <Can permission="employer-boq.delete">
                            <button
                              onClick={() => setDeleteCode(item.itemCode)}
                              disabled={deleting}
                              className={`text-danger hover:text-danger-dark ${deleting ? "opacity-50 cursor-not-allowed" : ""}`}
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
              {!initialLoading && filteredItems.length > 0 && (
                <tfoot className="bg-surface-secondary">
                  <tr className="border-t-2 border-primary">
                    <td colSpan={6} className="p-3 font-bold text-primary">
                      {isArabic ? "الإجمالي" : "Total"}
                    </td>
                    <td className="p-3 text-center font-bold text-gold text-lg">
                      {(total ?? 0).toLocaleString()} ج.م
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {!initialLoading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-3 border-t border-border">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-surface-secondary disabled:opacity-40"
              >
                {isArabic ? "السابق" : "Prev"}
              </button>
              <span className="text-sm text-text-secondary">
                {isArabic
                  ? `صفحة ${safePage} من ${totalPages}`
                  : `Page ${safePage} of ${totalPages}`}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-surface-secondary disabled:opacity-40"
              >
                {isArabic ? "التالي" : "Next"}
              </button>
            </div>
          )}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex justify-between p-5 border-b">
              <h2 className="font-bold text-primary">
                {editingItem
                  ? isArabic ? "تعديل بند" : "Edit Item"
                  : isArabic ? "إضافة بند" : "Add Item"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={saveItem} className="p-5 space-y-3">
              <div className="bg-surface-secondary p-3 rounded-lg text-center text-sm text-text-secondary">
                {isArabic ? "📌 سيتم إنشاء كود تلقائي للبند" : "📌 Item code will be generated automatically"}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "الوصف" : "Description"} *
                </label>
                <input
                  required
                  placeholder={isArabic ? "الوصف" : "Description"}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "الوحدة" : "Unit"} *
                  </label>
                  <input
                    required
                    placeholder={isArabic ? "وحدة" : "Unit"}
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "الكمية" : "Qty"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder={isArabic ? "كمية" : "Qty"}
                    value={form.quantity ?? ""}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "السعر" : "Price"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder={isArabic ? "فئة" : "Price"}
                    value={form.unitPrice ?? ""}
                    onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
              </div>

              <div className="bg-surface-secondary p-2 rounded-lg text-center text-sm">
                <span className="text-text-secondary">
                  {isArabic ? "القيمة الإجمالية:" : "Total Value:"}
                </span>
                <span className="font-bold text-gold mr-2">
                  {safeNumber(form.quantity * form.unitPrice).toLocaleString()} ج.م
                </span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className={`w-full py-2 bg-primary text-white rounded-xl transition ${saving ? "opacity-50 cursor-not-allowed" : "hover:bg-primary-dark"}`}
              >
                {saving ? (isArabic ? "جارى الحفظ..." : "Saving...") : (isArabic ? "حفظ" : "Save")}
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
