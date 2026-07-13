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
import { mockProjectFunds } from "@/lib/mockData";
import { financeApi } from "@/lib/api/financeApi";
import type { ProjectFund } from "@/types/finance";
import {
  getMiscellaneous,
  addMiscellaneous as addMiscStore,
  deleteMiscellaneous as deleteMiscStore,
  updateMiscellaneous as updateMiscStore,
  type MiscStoreItem,
} from "@/lib/mockData";

export default function ProjectMiscellaneousPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const { showToast, ToastComponent } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ State - جلب البيانات من الـ Store
  const [miscItems, setMiscItems] = useState<MiscStoreItem[]>(() =>
    getMiscellaneous(projectId)
  );

  const [projectFund, setProjectFund] = useState<ProjectFund | undefined>(
    mockProjectFunds.find((f) => f.projectId === projectId)
  );

  // ✅ تحميل العهدة من الـ API
  useEffect(() => {
    financeApi
      .getFund(projectId)
      .then(({ fund }) => setProjectFund(fund))
      .catch(() => {});
  }, [projectId]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MiscStoreItem | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<MiscStoreItem | null>(
    null
  );
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: 0,
    category: "food" as MiscStoreItem["category"],
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
      food: "bg-orange-100 text-orange-800",
      transport: "bg-blue-100 text-blue-800",
      tools: "bg-purple-100 text-purple-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
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

      // ✅ التحقق من رفع الفاتورة (إجباري)
      if (!invoiceFile) {
        showToast(
          isArabic
            ? "يرجى رفع الفاتورة (إلزامي)"
            : "Please upload the invoice (required)",
          "error"
        );
        return;
      }

      if (amount > fundBalance) {
        showToast(
          isArabic ? "رصيد العهدة غير كافٍ" : "Insufficient fund balance",
          "error"
        );
        return;
      }

      let invoiceData = undefined;
      if (invoiceFile) {
        const base64 = await fileToBase64(invoiceFile);
        invoiceData = {
          name: invoiceFile.name,
          url: base64,
          size: invoiceFile.size,
          type: invoiceFile.type,
          uploadedAt: new Date().toISOString(),
        };
      }

      if (editingItem) {
        // ✅ تعديل في الـ Store
        const updated = updateMiscStore(projectId, editingItem.id, {
          description: sanitizeInput(description),
          amount,
          category,
          notes: sanitizeInput(notes),
          invoiceFile: invoiceData,
        });

        if (updated) {
          setMiscItems(
            miscItems.map((item) =>
              item.id === editingItem.id ? updated : item
            )
          );
          showToast(
            isArabic ? "تم تعديل النثريات" : "Miscellaneous updated",
            "success"
          );
        }
      } else {
        // ✅ إضافة جديدة في الـ Store
        const saved = addMiscStore(projectId, {
          description: sanitizeInput(description),
          amount,
          category,
          date: new Date().toISOString().split("T")[0],
          notes: sanitizeInput(notes),
          createdBy: isArabic ? "مدير الموقع" : "Site Manager",
          invoiceFile: invoiceData,
        });

        setMiscItems([saved, ...miscItems]);

        // ✅ تحديث العهدة
        try {
          const { fund } = await financeApi.recordMiscellaneous({
            id: saved.id,
            projectId,
            description: saved.description,
            amount: saved.amount,
            category: saved.category,
            date: saved.date,
            notes: saved.notes,
            createdBy: saved.createdBy,
          });
          setProjectFund(fund);
        } catch (err) {
          // ✅ لو فشل، نرجع النثريات
          setMiscItems(miscItems);
          deleteMiscStore(projectId, saved.id);
          showToast(
            err instanceof Error
              ? err.message
              : isArabic
              ? "فشل الخصم من العهدة"
              : "Fund deduction failed",
            "error"
          );
          return;
        }

        showToast(
          isArabic ? "تم إضافة النثريات" : "Miscellaneous added",
          "success"
        );
      }
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
    },
    [
      miscItems,
      editingItem,
      formData,
      projectId,
      projectFund,
      fundBalance,
      showToast,
      isArabic,
      fileToBase64,
    ]
  );

  // ✅ عرض الفاتورة
  const viewInvoice = useCallback(
    (item: MiscStoreItem) => {
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
    (id: string) => {
      if (confirm(isArabic ? "هل أنت متأكد من الحذف؟" : "Are you sure?")) {
        const deletedItem = miscItems.find((m) => m.id === id);

        // ✅ حذف من الـ Store
        deleteMiscStore(projectId, id);
        setMiscItems(miscItems.filter((m) => m.id !== id));

        // ✅ تحديث العهدة (إضافة الرصيد مرة أخرى)
        if (deletedItem && projectFund) {
          const updatedFund = {
            ...projectFund,
            currentBalance: projectFund.currentBalance + deletedItem.amount,
            lastUpdated: new Date().toISOString().split("T")[0],
            transactions: [
              ...projectFund.transactions,
              {
                id: `pft-${Date.now()}`,
                type: "add" as const,
                category: "miscellaneous" as const,
                amount: deletedItem.amount,
                description: `استرجاع: ${deletedItem.description}`,
                date: new Date().toISOString().split("T")[0],
                referenceId: deletedItem.id,
              },
            ],
          };
          setProjectFund(updatedFund);
        }

        showToast(
          isArabic ? "تم حذف النثريات" : "Miscellaneous deleted",
          "success"
        );
      }
    },
    [miscItems, projectId, projectFund, showToast, isArabic]
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
  const openEditModal = useCallback((item: MiscStoreItem) => {
    setEditingItem(item);
    setFormData({
      description: item.description,
      amount: item.amount,
      category: item.category,
      notes: item.notes || "",
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
          transactions: [
            ...projectFund.transactions,
            {
              id: `pft-${Date.now()}`,
              type: "request" as const,
              category: "miscellaneous" as const,
              amount,
              description: `طلب زيادة عهدة نثريات: ${reason}`,
              date: new Date().toISOString().split("T")[0],
              status: "pending" as const,
            },
          ],
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
          initialBalance: projectFund.initialBalance + amount,
          currentBalance: projectFund.currentBalance + amount,
          lastUpdated: new Date().toISOString().split("T")[0],
          transactions: [
            ...projectFund.transactions,
            {
              id: `pft-${Date.now()}`,
              type: "add" as const,
              category: "miscellaneous" as const,
              amount,
              description: "زيادة عهدة نثريات (معتمدة)",
              date: new Date().toISOString().split("T")[0],
            },
          ],
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
          <p className="text-gray-500 text-sm">
            {isArabic ? "رصيد العهدة" : "Fund Balance"}
          </p>
          <p className="text-2xl font-bold text-gold">
            {fundBalance.toLocaleString()} ج.م
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-red-500"
          suppressHydrationWarning
        >
          <p className="text-gray-500 text-sm">
            {isArabic ? "إجمالي النثريات" : "Total Miscellaneous"}
          </p>
          <p className="text-2xl font-bold text-red-500">
            {totalMisc.toLocaleString()} ج.م
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-blue-500"
          suppressHydrationWarning
        >
          <p className="text-gray-500 text-sm">
            {isArabic ? "عدد المصروفات" : "Items Count"}
          </p>
          <p className="text-2xl font-bold text-blue-500">{miscItems.length}</p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3" suppressHydrationWarning>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
          suppressHydrationWarning
        >
          <Plus size={18} />
          {isArabic ? "إضافة نثريات" : "Add Miscellaneous"}
        </button>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
          suppressHydrationWarning
        >
          <DollarSign size={18} />
          {isArabic ? "طلب زيادة عهدة" : "Request Fund Increase"}
        </button>
        <button
          onClick={() => setShowFundModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition text-sm font-medium"
          suppressHydrationWarning
        >
          <Plus size={18} />
          {isArabic ? "إضافة رصيد للعهدة" : "Add Fund"}
        </button>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-lg shadow-sm"
        suppressHydrationWarning
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={isArabic ? "بحث..." : "Search..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 pl-4 py-2 border border-gray-200 rounded-lg w-full text-sm focus:outline-none focus:border-gold"
            suppressHydrationWarning
          />
        </div>
        <div className="relative min-w-[150px]">
          <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pr-10 pl-4 py-2 border border-gray-200 rounded-lg appearance-none text-sm focus:outline-none focus:border-gold w-full"
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
            <Coffee size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">
              {isArabic ? "لا توجد نثريات" : "No miscellaneous expenses"}
            </p>
          </Card>
        ) : (
          currentItems.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center hover:shadow-md transition"
              suppressHydrationWarning
            >
              <div className="flex items-center gap-4">
                <div className="text-center min-w-[80px]">
                  <p className="text-xs text-gray-400">{item.date}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(
                      item.category
                    )}`}
                  >
                    {getCategoryLabel(item.category)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {item.description}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-gray-400">{item.notes}</p>
                  )}
                  <p className="text-xs text-gray-400">{item.createdBy}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-red-500">
                  -{item.amount.toLocaleString()} ج.م
                </p>
                {item.invoiceFile ? (
                  <button
                    onClick={() => viewInvoice(item)}
                    className="text-blue-500 hover:text-blue-700 transition p-1"
                    title={isArabic ? "عرض الفاتورة" : "View Invoice"}
                    suppressHydrationWarning
                  >
                    <FileText size={16} />
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 w-[16px]">
                    {isArabic ? "لا" : "-"}
                  </span>
                )}
                <button
                  onClick={() => openEditModal(item)}
                  className="text-blue-500 hover:text-blue-700 transition p-1"
                  title={isArabic ? "تعديل" : "Edit"}
                  suppressHydrationWarning
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700 transition p-1"
                  title={isArabic ? "حذف" : "Delete"}
                  suppressHydrationWarning
                >
                  <Trash2 size={16} />
                </button>
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
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white">
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
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "البيان" : "Description"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  required
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "المبلغ" : "Amount"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount || ""}
                  onChange={(e) => updateForm("amount", Number(e.target.value))}
                  min="1"
                  step="any"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  required
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "التصنيف" : "Category"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    updateForm(
                      "category",
                      e.target.value as MiscStoreItem["category"]
                    )
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "ملاحظات" : "Notes"}
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  suppressHydrationWarning
                />
              </div>

              {/* ✅ رفع الفاتورة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "رفع الفاتورة" : "Upload Invoice"}{" "}
                  <span className="text-red-500">*</span>
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
                        ? "border-green-500 text-green-500 bg-green-50 hover:bg-green-100"
                        : "border-red-400 text-red-500 hover:bg-red-50"
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
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg">
                      <FileText size={14} className="text-green-600" />
                      <span className="text-xs text-gray-600 truncate max-w-[150px]">
                        {formData.invoiceFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-red-500 mt-1">
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
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
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "فاتورة النثريات" : "Miscellaneous Invoice"}
              </h2>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-bold">
                    {isArabic ? "اسم الملف:" : "File:"}
                  </span>{" "}
                  {selectedInvoice.invoiceFile.name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-bold">
                    {isArabic ? "الحجم:" : "Size:"}
                  </span>{" "}
                  {(selectedInvoice.invoiceFile.size / 1024).toFixed(2)} KB
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-bold">
                    {isArabic ? "تاريخ الرفع:" : "Uploaded:"}
                  </span>{" "}
                  {selectedInvoice.invoiceFile.uploadedAt}
                </p>
              </div>
              <div className="border rounded-lg p-4 min-h-[300px] flex items-center justify-center">
                {selectedInvoice.invoiceFile.type.startsWith("image/") ? (
                  <img
                    src={selectedInvoice.invoiceFile.url}
                    alt={selectedInvoice.invoiceFile.name}
                    className="max-w-full max-h-[500px] object-contain"
                  />
                ) : selectedInvoice.invoiceFile.type === "application/pdf" ? (
                  <iframe
                    src={selectedInvoice.invoiceFile.url}
                    className="w-full h-[500px]"
                    title={selectedInvoice.invoiceFile.name}
                  />
                ) : (
                  <div className="text-center">
                    <FileText
                      size={64}
                      className="mx-auto text-gray-300 mb-3"
                    />
                    <p className="text-gray-500">
                      {isArabic
                        ? "لا يمكن عرض هذا النوع من الملفات"
                        : "Cannot preview this file type"}
                    </p>
                    <a
                      href={selectedInvoice.invoiceFile.url}
                      download={selectedInvoice.invoiceFile.name}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                    >
                      <Download size={16} />
                      {isArabic ? "تحميل الملف" : "Download File"}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Fund Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {isArabic
                  ? "طلب زيادة عهدة النثريات"
                  : "Request Misc Fund Increase"}
              </h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRequestFund} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "المبلغ المطلوب" : "Requested Amount"}
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  step="any"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder={isArabic ? "أدخل المبلغ" : "Enter amount"}
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "السبب" : "Reason"}
                </label>
                <input
                  type="text"
                  name="reason"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition"
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
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "إضافة رصيد للعهدة" : "Add Fund"}
              </h2>
              <button
                onClick={() => setShowFundModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <p className="text-gray-600 mb-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "المبلغ المضاف" : "Amount to Add"}
                  </label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="1"
                    step="any"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder={isArabic ? "أدخل المبلغ" : "Enter amount"}
                    suppressHydrationWarning
                  />
                </div>
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowFundModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
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
