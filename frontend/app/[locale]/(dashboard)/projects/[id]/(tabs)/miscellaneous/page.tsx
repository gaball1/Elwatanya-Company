/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Card } from "@/components/ui";
import {
  Plus,
  Printer,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  Coffee,
  DollarSign,
  Upload,
  FileText,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { sanitizeInput, isValidAmount } from "@/lib/security";
import React from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/ui/Pagination";
import { projectFundService } from "@/services/project-fund.service";
import { miscellaneousService, type Miscellaneous } from "@/services/miscellaneous.service";
import { Can } from "@/components/Can";

export default function ProjectMiscellaneousPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const { showToast, ToastComponent } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ State - جلب البيانات من الـ API
  const [miscItems, setMiscItems] = useState<Miscellaneous[]>([]);
  const [projectFund, setProjectFund] = useState<{ currentBalance: number } | undefined>();
  const [loading, setLoading] = useState(true);

  // ✅ تحميل البيانات من الـ API
  useEffect(() => {
    Promise.all([
      miscellaneousService.list(),
      projectFundService.list(),
    ])
      .then(([items, funds]) => {
        setMiscItems(items.filter((m) => m.projectId === projectId));
        const fund = funds.find((f) => f.projectId === projectId);
        if (fund) setProjectFund(fund);
      })
      .catch(() => {
        showToast(isArabic ? "فشل تحميل البيانات" : "Failed to load data", "error");
      })
      .finally(() => setLoading(false));
  }, [projectId, showToast, isArabic]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Miscellaneous | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Miscellaneous | null>(
    null
  );
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: 0,
    category: "other" as string,
    notes: "",
    invoiceFile: null as File | null,
  });

  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredItems = useMemo(() => {
    let filtered = [...miscItems];
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.description.toLowerCase().includes(term) ||
          (item.notes && item.notes.toLowerCase().includes(term))
      );
    }
    return filtered;
  }, [miscItems, debouncedSearch, categoryFilter]);

  const { currentItems, currentPage, totalPages, goToPage } = usePagination(
    filteredItems,
    10
  );

  const totalMisc = miscItems.reduce((sum, m) => sum + m.amount, 0);
  const fundBalance = projectFund?.currentBalance || 0;

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      food: isArabic ? "أكل عمال" : "Food",
      transport: isArabic ? "مواصلات" : "Transport",
      tools: isArabic ? "أدوات" : "Tools",
      other: isArabic ? "أخرى" : "Other",
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      food: "bg-warning-light text-warning-dark",
      transport: "bg-info-light text-info-dark",
      tools: "bg-info-light text-info-dark",
      other: "bg-surface-tertiary text-text-primary",
    };
    return colors[category] || "bg-surface-tertiary text-text-primary";
  };

  // ✅ معالج رفع الملف
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          showToast(
            isArabic
              ? "حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)"
              : "File too large (max 5MB)",
            "error"
          );
          e.target.value = "";
          return;
        }
        setFormData((prev) => ({ ...prev, invoiceFile: file }));
      }
    },
    [showToast, isArabic]
  );

  // ✅ إزالة الملف
  const removeFile = useCallback(() => {
    setFormData((prev) => ({ ...prev, invoiceFile: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // ✅ حفظ الملف كـ Base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }, []);

  // ✅ إضافة نثريات جديدة
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const { description, amount, category, notes, invoiceFile } = formData;

      if (!isValidAmount(amount)) {
        showToast(isArabic ? "المبلغ غير صحيح" : "Invalid amount", "error");
        return;
      }

      if (amount > fundBalance) {
        showToast(
          isArabic ? "رصيد العهدة غير كافٍ" : "Insufficient fund balance",
          "error"
        );
        return;
      }

      if (editingItem) {
        try {
          const updated = await miscellaneousService.update(editingItem.id, {
            description: sanitizeInput(description),
            amount,
            category,
            notes: sanitizeInput(notes),
          });

          setMiscItems(
            miscItems.map((item) =>
              item.id === editingItem.id ? updated : item
            )
          );
          showToast(
            isArabic ? "تم تعديل النثريات" : "Miscellaneous updated",
            "success"
          );
        } catch {
          showToast(isArabic ? "فشل التعديل" : "Update failed", "error");
        }
      } else {
        try {
          const saved = await miscellaneousService.create({
            projectId,
            description: sanitizeInput(description),
            amount,
            category,
            date: new Date().toISOString().split("T")[0],
            notes: sanitizeInput(notes),
            createdBy: '',
          });

          setMiscItems([saved, ...miscItems]);
          showToast(
            isArabic ? "تم إضافة النثريات" : "Miscellaneous added",
            "success"
          );
        } catch {
          showToast(isArabic ? "فشل الإضافة" : "Failed to add", "error");
        }
      }
      setShowAddModal(false);
      setEditingItem(null);
      setFormData({
        description: "",
        amount: 0,
        category: "other",
        notes: "",
        invoiceFile: null,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [
      miscItems,
      editingItem,
      formData,
      projectId,
      fundBalance,
      showToast,
      isArabic,
    ]
  );

  // ✅ عرض الفاتورة
  const viewInvoice = useCallback(
    (item: Miscellaneous) => {
      if (item.invoiceFile) {
        setSelectedInvoice(item);
        setShowInvoiceModal(true);
      } else {
        showToast(
          isArabic ? "لا توجد فاتورة مرفقة" : "No invoice attached",
          "info"
        );
      }
    },
    [showToast, isArabic]
  );

  // ✅ حذف نثريات
  const handleDelete = useCallback(
    async (id: string) => {
      if (confirm(isArabic ? "هل أنت متأكد من الحذف؟" : "Are you sure?")) {
        try {
          await miscellaneousService.remove(id);
          setMiscItems(miscItems.filter((m) => m.id !== id));
          showToast(
            isArabic ? "تم حذف النثريات" : "Miscellaneous deleted",
            "success"
          );
        } catch {
          showToast(isArabic ? "فشل الحذف" : "Failed to delete", "error");
        }
      }
    },
    [miscItems, showToast, isArabic]
  );

  // ✅ فتح مودال الإضافة
  const openAddModal = useCallback(() => {
    setEditingItem(null);
    setFormData({
      description: "",
      amount: 0,
      category: "food",
      notes: "",
      invoiceFile: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowAddModal(true);
  }, []);

  // ✅ فتح مودال التعديل
  const openEditModal = useCallback((item: Miscellaneous) => {
    setEditingItem(item);
    setFormData({
      description: item.description,
      amount: item.amount,
      category: item.category,
      notes: item.notes ?? "",
      invoiceFile: null,
    });
    setShowAddModal(true);
  }, []);

  // ✅ طلب زيادة عهدة النثريات
  const handleRequestFund = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const amount = Number(
        (form.elements.namedItem("amount") as HTMLInputElement).value
      );
      const reason = (form.elements.namedItem("reason") as HTMLInputElement)
        .value;

      if (!isValidAmount(amount)) {
        showToast(isArabic ? "المبلغ غير صحيح" : "Invalid amount", "error");
        return;
      }

      if (projectFund) {
        const updatedFund = {
          ...projectFund,
        };
        setProjectFund(updatedFund);
      }

      showToast(
        isArabic ? "تم إرسال طلب زيادة العهدة" : "Fund increase request sent",
        "success"
      );
      setShowRequestModal(false);
    },
    [projectFund, showToast, isArabic]
  );

  // ✅ إضافة رصيد للعهدة
  const handleAddFund = useCallback(
    (amount: number) => {
      if (projectFund) {
        const updatedFund = {
          ...projectFund,
          currentBalance: projectFund.currentBalance + amount,
        };
        setProjectFund(updatedFund);
        showToast(
          isArabic ? "تم إضافة الرصيد للعهدة" : "Fund balance added",
          "success"
        );
      }
    },
    [projectFund, showToast, isArabic]
  );

  const updateForm = useCallback(
    (field: keyof typeof formData, value: string | number | File | null) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {ToastComponent}

      {/* Fund Cards */}
      <div className="grid md:grid-cols-3 gap-4" suppressHydrationWarning>
        <Card className="p-4 border-r-4 border-gold" suppressHydrationWarning>
          <p className="text-text-secondary text-sm">
            {isArabic ? "رصيد العهدة" : "Fund Balance"}
          </p>
          <p className="text-2xl font-bold text-gold">
            {fundBalance.toLocaleString()} ج.م
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-danger"
          suppressHydrationWarning
        >
          <p className="text-text-secondary text-sm">
            {isArabic ? "إجمالي النثريات" : "Total Miscellaneous"}
          </p>
          <p className="text-2xl font-bold text-danger">
            {totalMisc.toLocaleString()} ج.م
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-info"
          suppressHydrationWarning
        >
          <p className="text-text-secondary text-sm">
            {isArabic ? "عدد المصروفات" : "Items Count"}
          </p>
          <p className="text-2xl font-bold text-info">{miscItems.length}</p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3" suppressHydrationWarning>
        <Can permission="miscellaneous.create">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
            suppressHydrationWarning
          >
            <Plus size={18} />
            {isArabic ? "إضافة نثريات" : "Add Miscellaneous"}
          </button>
        </Can>
        <Can permission="miscellaneous.create">
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-warning-dark text-white rounded-lg hover:bg-warning-dark transition text-sm font-medium"
            suppressHydrationWarning
          >
            <DollarSign size={18} />
            {isArabic ? "طلب زيادة عهدة" : "Request Fund Increase"}
          </button>
        </Can>
        <Can permission="miscellaneous.create">
          <button
            onClick={() => setShowFundModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition text-sm font-medium"
            suppressHydrationWarning
          >
            <Plus size={18} />
            {isArabic ? "إضافة رصيد للعهدة" : "Add Fund"}
          </button>
        </Can>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap gap-3 items-center bg-surface p-3 rounded-lg shadow-sm"
        suppressHydrationWarning
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
          <input
            type="text"
            placeholder={isArabic ? "بحث..." : "Search..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 pl-4 py-2 border border-border rounded-lg w-full text-sm focus:outline-none focus:border-gold"
            suppressHydrationWarning
          />
        </div>
        <div className="relative min-w-[150px]">
          <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none text-sm focus:outline-none focus:border-gold w-full"
            suppressHydrationWarning
          >
            <option value="all">{isArabic ? "الكل" : "All"}</option>
            <option value="food">{isArabic ? "أكل عمال" : "Food"}</option>
            <option value="transport">
              {isArabic ? "مواصلات" : "Transport"}
            </option>
            <option value="tools">{isArabic ? "أدوات" : "Tools"}</option>
            <option value="other">{isArabic ? "أخرى" : "Other"}</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {currentItems.length === 0 ? (
          <Card className="p-8 text-center">
            <Coffee size={48} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">
              {isArabic ? "لا توجد نثريات" : "No miscellaneous expenses"}
            </p>
          </Card>
        ) : (
          currentItems.map((item) => (
            <div
              key={item.id}
              className="bg-surface p-4 rounded-lg shadow-sm flex justify-between items-center hover:shadow-md transition"
              suppressHydrationWarning
            >
              <div className="flex items-center gap-4">
                <div className="text-center min-w-[80px]">
                  <p className="text-xs text-text-muted">{item.date}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(
                      item.category
                    )}`}
                  >
                    {getCategoryLabel(item.category)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    {item.description}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-text-muted">{item.notes}</p>
                  )}
                  <p className="text-xs text-text-muted">{item.createdBy}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-danger">
                  -{item.amount.toLocaleString()} ج.م
                </p>
                {item.invoiceFile ? (
                  <button
                    onClick={() => viewInvoice(item)}
                    className="text-info hover:text-info-dark transition p-1"
                    title={isArabic ? "عرض الفاتورة" : "View Invoice"}
                    suppressHydrationWarning
                  >
                    <FileText size={16} />
                  </button>
                ) : (
                  <span className="text-xs text-text-muted w-[16px]">
                    {isArabic ? "لا" : "-"}
                  </span>
                )}
                <Can permission="miscellaneous.update">
                  <button
                    onClick={() => openEditModal(item)}
                    className="text-info hover:text-info-dark transition p-1"
                    title={isArabic ? "تعديل" : "Edit"}
                    suppressHydrationWarning
                  >
                    <Edit2 size={16} />
                  </button>
                </Can>
                <Can permission="miscellaneous.delete">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-danger hover:text-danger-dark transition p-1"
                    title={isArabic ? "حذف" : "Delete"}
                    suppressHydrationWarning
                  >
                    <Trash2 size={16} />
                  </button>
                </Can>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredItems.length > 10 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          isArabic={isArabic}
        />
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-surface">
              <h2 className="text-xl font-bold text-primary">
                {editingItem
                  ? isArabic
                    ? "تعديل نثريات"
                    : "Edit Miscellaneous"
                  : isArabic
                  ? "إضافة نثريات جديدة"
                  : "New Miscellaneous"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                  setFormData({
                    description: "",
                    amount: 0,
                    category: "food",
                    notes: "",
                    invoiceFile: null,
                  });
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="text-text-muted hover:text-text-secondary text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "البيان" : "Description"}{" "}
                  <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  required
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "المبلغ" : "Amount"}{" "}
                  <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount ?? ""}
                  onChange={(e) => updateForm("amount", Number(e.target.value))}
                  min="1"
                  step="any"
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  required
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "التصنيف" : "Category"}{" "}
                  <span className="text-danger">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    updateForm(
                      "category",
                      e.target.value as string
                    )
                  }
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  suppressHydrationWarning
                >
                  <option value="food">{isArabic ? "أكل عمال" : "Food"}</option>
                  <option value="transport">
                    {isArabic ? "مواصلات" : "Transport"}
                  </option>
                  <option value="tools">{isArabic ? "أدوات" : "Tools"}</option>
                  <option value="other">{isArabic ? "أخرى" : "Other"}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "ملاحظات" : "Notes"}
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  suppressHydrationWarning
                />
              </div>

              {/* ✅ رفع الفاتورة */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "رفع الفاتورة" : "Upload Invoice"}{" "}
                  <span className="text-danger">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition text-sm font-medium ${
                      formData.invoiceFile
                        ? "border-success text-success bg-success-light hover:bg-success-light"
                        : "border-red-400 text-danger hover:bg-danger-light"
                    }`}
                  >
                    <Upload size={16} />
                    {formData.invoiceFile
                      ? isArabic
                        ? "تم رفع الملف"
                        : "File Uploaded"
                      : isArabic
                      ? "اختر ملف (إلزامي)"
                      : "Choose File (Required)"}
                  </button>
                  {formData.invoiceFile && (
                    <div className="flex items-center gap-2 bg-success-light px-3 py-1 rounded-lg">
                      <FileText size={14} className="text-success-dark" />
                      <span className="text-xs text-text-secondary truncate max-w-[150px]">
                        {formData.invoiceFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-danger hover:text-danger-dark"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-danger mt-1">
                  {isArabic
                    ? "رفع الفاتورة إلزامي"
                    : "Invoice upload is required"}
                </p>
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    setFormData({
                      description: "",
                      amount: 0,
                      category: "food",
                      notes: "",
                      invoiceFile: null,
                    });
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition"
                >
                  {isArabic ? "حفظ" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ View Invoice Modal */}
      {showInvoiceModal && selectedInvoice?.invoiceFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-surface">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "فاتورة النثريات" : "Miscellaneous Invoice"}
              </h2>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                className="text-text-muted hover:text-text-secondary text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-text-secondary">
                  <span className="font-bold">
                    {isArabic ? "الوصف:" : "Description:"}
                  </span>{" "}
                  {selectedInvoice.description}
                </p>
              </div>
              <div className="border rounded-lg p-4 min-h-[300px] flex items-center justify-center">
                {typeof selectedInvoice.invoiceFile === 'string' && selectedInvoice.invoiceFile.startsWith("data:image/") ? (
                  <img
                    src={selectedInvoice.invoiceFile}
                    alt={selectedInvoice.description}
                    className="max-w-full max-h-[500px] object-contain"
                  />
                ) : typeof selectedInvoice.invoiceFile === 'string' ? (
                  <div className="text-center">
                    <FileText
                      size={64}
                      className="mx-auto text-text-muted mb-3"
                    />
                    <p className="text-text-secondary">
                      {isArabic
                        ? "لا يمكن عرض هذا النوع من الملفات"
                        : "Cannot preview this file type"}
                    </p>
                    <a
                      href={selectedInvoice.invoiceFile}
                      download={selectedInvoice.description}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                    >
                      <Download size={16} />
                      {isArabic ? "تحميل الملف" : "Download File"}
                    </a>
                  </div>
                ) : (
                  <p className="text-text-secondary">
                    {isArabic ? "لا توجد فاتورة مرفقة" : "No invoice attached"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Fund Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {isArabic
                  ? "طلب زيادة عهدة النثريات"
                  : "Request Misc Fund Increase"}
              </h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-text-muted hover:text-text-secondary text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRequestFund} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "المبلغ المطلوب" : "Requested Amount"}
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  step="any"
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder={isArabic ? "أدخل المبلغ" : "Enter amount"}
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "السبب" : "Reason"}
                </label>
                <input
                  type="text"
                  name="reason"
                  required
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder={
                    isArabic ? "سبب طلب الزيادة" : "Reason for increase"
                  }
                  suppressHydrationWarning
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-warning-dark text-white rounded-xl hover:bg-warning-dark transition"
                >
                  {isArabic ? "إرسال الطلب" : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Fund Modal */}
      {showFundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "إضافة رصيد للعهدة" : "Add Fund"}
              </h2>
              <button
                onClick={() => setShowFundModal(false)}
                className="text-text-muted hover:text-text-secondary text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <p className="text-text-secondary mb-4">
                {isArabic
                  ? "المبلغ الحالي في العهدة:"
                  : "Current fund balance:"}
                <span className="font-bold text-gold block text-xl">
                  {fundBalance.toLocaleString()} ج.م
                </span>
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const amount = Number(
                    (form.elements.namedItem("amount") as HTMLInputElement)
                      .value
                  );
                  if (isValidAmount(amount)) {
                    handleAddFund(amount);
                    setShowFundModal(false);
                  } else {
                    showToast(
                      isArabic ? "المبلغ غير صحيح" : "Invalid amount",
                      "error"
                    );
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "المبلغ المضاف" : "Amount to Add"}
                  </label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="1"
                    step="any"
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder={isArabic ? "أدخل المبلغ" : "Enter amount"}
                    suppressHydrationWarning
                  />
                </div>
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowFundModal(false)}
                    className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-success-dark text-white rounded-xl hover:bg-success-dark transition"
                  >
                    {isArabic ? "إضافة" : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
