/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import DataLoader from "@/components/shared/DataLoader";
import { Can } from '@/components/Can';
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Filter,
  Download,
  ArrowUpDown,
} from "lucide-react";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import { categoryService, type Category } from "@/services/category.service";
import { useToast } from "@/components/ui/Toast";
import { printAsPDF } from "@/lib/printUtils";

export default function CategoriesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "code">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await categoryService.list();
      setCategories(data);
    } catch (error) {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    parentId: "",
    status: "active",
  });

  const statusOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "active", label: isArabic ? "نشط" : "Active" },
    { value: "inactive", label: isArabic ? "غير نشط" : "Inactive" },
  ];

  const filteredAndSortedCategories = useMemo(() => {
    let filtered = [...categories];
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.code.toLowerCase().includes(term)
      );
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") comparison = a.name.localeCompare(b.name);
      else if (sortBy === "code") comparison = a.code.localeCompare(b.code);
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [categories, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const openAddModal = useCallback(() => {
    setEditingCategory(null);
    setForm({
      code: "",
      name: "",
      description: "",
      parentId: "",
      status: "active",
    });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((category: Category) => {
    setEditingCategory(category);
    setForm({
      code: category.code,
      name: category.name,
      description: category.description || "",
      parentId: category.parentId || "",
      status: category.status,
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload: any = {
          code: form.code,
          name: form.name,
          description: form.description || undefined,
          status: form.status,
        };
        if (form.parentId) payload.parentId = form.parentId;
        if (editingCategory) {
          await categoryService.update(editingCategory.id, payload);
          showToast(isArabic ? "تم تحديث التصنيف" : "Category updated", "success");
        } else {
          await categoryService.create(payload);
          showToast(isArabic ? "تم إضافة التصنيف بنجاح" : "Category added", "success");
        }
        await fetchCategories();
      } catch (error: any) {
        showToast(error?.message || (isArabic ? "حدث خطأ" : "An error occurred"), "error");
      }
      setShowModal(false);
      setEditingCategory(null);
    },
    [form, editingCategory, isArabic, fetchCategories]
  );

  const handleDelete = useCallback(async () => {
    if (deletingId) {
      try {
        await categoryService.remove(deletingId);
        await fetchCategories();
        showToast(isArabic ? "تم حذف التصنيف" : "Category deleted", "success");
      } catch (error: any) {
        showToast(error?.message || "Error", "error");
      }
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  }, [deletingId, isArabic, fetchCategories]);

  const handlePrintPDF = useCallback((logoUrl?: string) => {
    const headers = [
      isArabic ? "رمز التصنيف" : "Code",
      isArabic ? "اسم التصنيف" : "Name",
      isArabic ? "الوصف" : "Description",
      isArabic ? "التصنيف الأب" : "Parent",
      isArabic ? "الحالة" : "Status",
    ];
    const rows = filteredAndSortedCategories.map((c) => [
      c.code,
      c.name,
      c.description || "—",
      categories.find((cat) => cat.id === c.parentId)?.name || "—",
      c.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive"),
    ]);
    printAsPDF(rows, headers, isArabic ? "تقرير التصنيفات" : "Categories Report", isArabic, { logoUrl });
  }, [filteredAndSortedCategories, isArabic]);

  const exportToExcel = useCallback(() => {
    const headers = ["رمز التصنيف", "اسم التصنيف", "الوصف", "التصنيف الأب", "الحالة"];
    const rows = filteredAndSortedCategories.map((c) => [
      c.code, c.name, c.description || "", categories.find((cat) => cat.id === c.parentId)?.name || "", c.status === "active" ? "نشط" : "غير نشط",
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `categories_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredAndSortedCategories, isArabic]);

  const toggleSort = useCallback(
    (field: "name" | "code") => {
      if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      else { setSortBy(field); setSortOrder("asc"); }
    },
    [sortBy, sortOrder]
  );

  const getStatusBadge = (status: string) => {
    if (status === "active") return { text: isArabic ? "نشط" : "Active", className: "bg-success-light text-success-dark" };
    return { text: isArabic ? "غير نشط" : "Inactive", className: "bg-surface-tertiary text-text-secondary" };
  };

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">{isArabic ? "التصنيفات" : "Categories"}</h1>
            <p className="text-sm text-text-secondary mt-1">{isArabic ? "إدارة تصنيفات المخزون" : "Manage inventory categories"}</p>
          </div>
          <div className="flex gap-2">
            <PrintPdfButton label={isArabic ? "طباعة PDF" : "Print PDF"} onPrint={handlePrintPDF} />
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition">
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <Can permission="categories.create">
              <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                <Plus size={18} /> {isArabic ? "إضافة تصنيف" : "Add Category"}
              </button>
            </Can>
          </div>
        </div>
      </div>

      <div className="bg-surface border-b px-6 py-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
              <input type="text" placeholder={isArabic ? "بحث بالاسم أو الرمز..." : "Search by name or code..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg w-64 focus:outline-none focus:border-gold" />
            </div>
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none focus:outline-none focus:border-gold">
                {statusOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-text-secondary">{isArabic ? "ترتيب حسب:" : "Sort by:"}</span>
            <button onClick={() => toggleSort("name")} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${sortBy === "name" ? "bg-gold text-white" : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"}`}>
              {isArabic ? "الاسم" : "Name"} <ArrowUpDown size={14} />
            </button>
            <button onClick={() => toggleSort("code")} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${sortBy === "code" ? "bg-gold text-white" : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"}`}>
              {isArabic ? "الرمز" : "Code"} <ArrowUpDown size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3">
        <p className="text-sm text-text-secondary">
          {isArabic ? `عرض ${filteredAndSortedCategories.length} من ${categories.length} تصنيف` : `Showing ${filteredAndSortedCategories.length} of ${categories.length} categories`}
        </p>
      </div>

      <div className="p-6 pt-0">
        {loading ? (
          <DataLoader />
        ) : filteredAndSortedCategories.length === 0 ? (
          <Card className="p-12 text-center">
            <Tags size={64} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">{isArabic ? "لا يوجد تصنيفات مطابقة للبحث" : "No matching categories found"}</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedCategories.map((category) => {
              const status = getStatusBadge(category.status);
              return (
                <Card key={category.id} hover className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Tags className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-primary">{category.name}</h3>
                        <p className="text-sm text-gold">{category.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Can permission="categories.update">
                        <button onClick={() => openEditModal(category)} className="p-1 text-text-muted hover:text-info"><Edit2 size={16} /></button>
                      </Can>
                      <Can permission="categories.delete">
                        <button onClick={() => { setDeletingId(category.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger"><Trash2 size={16} /></button>
                      </Can>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    <p>{isArabic ? "الوصف" : "Description"}: {category.description || "—"}</p>
                    <p>{isArabic ? "التصنيف الأب" : "Parent"}: {categories.find((c) => c.id === category.parentId)?.name || "—"}</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-light flex justify-between items-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>{status.text}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {editingCategory ? (isArabic ? "تعديل التصنيف" : "Edit Category") : (isArabic ? "إضافة تصنيف جديد" : "Add New Category")}
              </h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input type="text" name="code" placeholder={isArabic ? "رمز التصنيف" : "Category Code"} value={form.code} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <input type="text" name="name" placeholder={isArabic ? "اسم التصنيف" : "Category Name"} value={form.name} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <textarea name="description" placeholder={isArabic ? "الوصف" : "Description"} value={form.description} onChange={handleInputChange} className="w-full p-3 border rounded-xl" rows={3} />
              <div>
                <label className="block text-sm text-text-secondary mb-1">{isArabic ? "التصنيف الأب (اختياري)" : "Parent Category (Optional)"}</label>
                <select name="parentId" value={form.parentId} onChange={handleInputChange} className="w-full p-3 border rounded-xl">
                  <option value="">{isArabic ? "— تصنيف رئيسي (بدون أب) —" : "— Top-level (no parent) —"}</option>
                  {categories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-xs text-text-muted mt-1">{isArabic ? "لا توجد تصنيفات بعد — سيتم إنشاء هذا كتصنيف رئيسي" : "No categories yet — this will be a top-level category"}</p>
                )}
              </div>
              <select name="status" value={form.status} onChange={handleInputChange} className="w-full p-3 border rounded-xl">
                <option value="active">{isArabic ? "نشط" : "Active"}</option>
                <option value="inactive">{isArabic ? "غير نشط" : "Inactive"}</option>
              </select>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{editingCategory ? (isArabic ? "تحديث" : "Update") : (isArabic ? "حفظ" : "Save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b"><h2 className="text-xl font-bold text-primary">{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</h2></div>
            <div className="p-5">
              <p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذا التصنيف؟" : "Are you sure you want to delete this category?"}</p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-danger text-white rounded-xl">{isArabic ? "حذف" : "Delete"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
