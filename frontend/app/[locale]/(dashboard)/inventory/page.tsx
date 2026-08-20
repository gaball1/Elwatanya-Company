/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import DataLoader from "@/components/shared/DataLoader";
import { Can } from '@/components/Can';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import { inventoryItemService, type InventoryItem } from "@/services/inventory-item.service";
import { categoryService, type Category } from "@/services/category.service";
import { warehouseService, type Warehouse } from "@/services/warehouse.service";
import { approvalService } from "@/services/approval.service";
import { useToast } from "@/components/ui/Toast";
import { printAsPDF } from "@/lib/printUtils";

export default function InventoryPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalItem, setApprovalItem] = useState<InventoryItem | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<"draft" | "pending">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "quantity" | "price">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await inventoryItemService.list(
        categoryFilter === "all" ? undefined : categoryFilter,
        warehouseFilter === "all" ? undefined : warehouseFilter,
        (params.id as string) || undefined
      );
      setItems(data);
    } catch (error) {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic, categoryFilter, warehouseFilter, params.id]);

  useEffect(() => {
    fetchItems();
    categoryService
      .list()
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]));
    warehouseService
      .list((params.id as string) || undefined)
      .then((ws) => setWarehouses(ws))
      .catch(() => setWarehouses([]));
  }, [fetchItems, params.id]);

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    categoryId: "",
    warehouseId: "",
    unit: "",
    quantity: "0",
    reason: "",
    minQuantity: "0",
    price: "0",
    status: "active",
  });

  const statusOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "active", label: isArabic ? "نشط" : "Active" },
    { value: "inactive", label: isArabic ? "غير نشط" : "Inactive" },
  ];

  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...items];
    if (statusFilter !== "all") {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter((i) => i.categoryId === categoryFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(term) ||
          i.code.toLowerCase().includes(term)
      );
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") comparison = a.name.localeCompare(b.name);
      else if (sortBy === "quantity") comparison = a.quantity - b.quantity;
      else if (sortBy === "price") comparison = a.price - b.price;
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [items, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const openAddModal = useCallback(() => {
    setEditingItem(null);
    setForm({
      code: "",
      name: "",
      description: "",
      categoryId: "",
      warehouseId: "",
      unit: "",
      quantity: "0",
      reason: "",
      minQuantity: "0",
      price: "0",
      status: "active",
    });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description || "",
      categoryId: item.categoryId || "",
      warehouseId: item.warehouseId || "",
      unit: item.unit || "",
      quantity: String(item.quantity),
      reason: "",
      minQuantity: String(item.minQuantity),
      price: String(item.price),
      status: item.status,
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload = {
          code: form.code,
          name: form.name,
          description: form.description || undefined,
          categoryId: form.categoryId || undefined,
          warehouseId: form.warehouseId || undefined,
          projectId: (params.id as string) || undefined,
          unit: form.unit || undefined,
          quantity: Number(form.quantity),
          reason: form.reason || undefined,
          minQuantity: Number(form.minQuantity),
          price: Number(form.price),
          status: form.status,
        };
        if (editingItem) {
          await inventoryItemService.update(editingItem.id, payload);
          showToast(isArabic ? "تم تحديث الصنف" : "Item updated", "success");
        } else {
          await inventoryItemService.create(payload);
          showToast(isArabic ? "تم إضافة الصنف بنجاح" : "Item added", "success");
        }
        await fetchItems();
      } catch (error: any) {
        showToast(error?.message || (isArabic ? "حدث خطأ" : "An error occurred"), "error");
      }
      setShowModal(false);
      setEditingItem(null);
    },
    [form, editingItem, isArabic, fetchItems]
  );

  const handleDelete = useCallback(async () => {
    if (deletingId) {
      try {
        await inventoryItemService.remove(deletingId);
        await fetchItems();
        showToast(isArabic ? "تم حذف الصنف" : "Item deleted", "success");
      } catch (error: any) {
        showToast(error?.message || "Error", "error");
      }
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  }, [deletingId, isArabic, fetchItems]);

  const openApprovalModal = useCallback((item: InventoryItem) => {
    setApprovalItem(item);
    setApprovalComment("");
    setApprovalStatus("pending");
    setShowApprovalModal(true);
  }, []);

  const handleApprovalSubmit = useCallback(async () => {
    if (!approvalItem) return;
    try {
      await approvalService.request({
        entityType: "inventory",
        entityId: approvalItem.id,
        comment: approvalComment || undefined,
        status: approvalStatus,
      });
      showToast(
        approvalStatus === "draft"
          ? isArabic
            ? "تم حفظ الطلب كمسودة"
            : "Request saved as draft"
          : isArabic
          ? "تم إرسال طلب الموافقة"
          : "Approval request submitted",
        "success"
      );
      setShowApprovalModal(false);
      setApprovalItem(null);
    } catch (error: any) {
      showToast(
        error?.message || (isArabic ? "فشل إرسال الطلب" : "Failed to submit request"),
        "error"
      );
    }
  }, [approvalItem, approvalComment, approvalStatus, showToast, isArabic]);

  const handlePrintPDF = useCallback((logoUrl?: string) => {
    const headers = [
      isArabic ? "الكود" : "Code",
      isArabic ? "الاسم" : "Name",
      isArabic ? "الوصف" : "Description",
      isArabic ? "الوحدة" : "Unit",
      isArabic ? "الكمية" : "Quantity",
      isArabic ? "الحد الأدنى" : "Min Qty",
      isArabic ? "السعر" : "Price",
      isArabic ? "الحالة" : "Status",
    ];
    const rows = filteredAndSortedItems.map((i) => [
      i.code,
      i.name,
      i.description || "—",
      i.unit || "—",
      String(i.quantity),
      String(i.minQuantity),
      String(i.price),
      i.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive"),
    ]);
    printAsPDF(rows, headers, isArabic ? "تقرير المخزون" : "Inventory Report", isArabic, { logoUrl });
  }, [filteredAndSortedItems, isArabic]);

  const exportToExcel = useCallback(() => {
    const headers = ["الكود", "الاسم", "الوصف", "الوحدة", "الكمية", "الحد الأدنى", "السعر", "الحالة"];
    const rows = filteredAndSortedItems.map((i) => [
      i.code, i.name, i.description || "", i.unit || "",
      String(i.quantity), String(i.minQuantity), String(i.price),
      i.status === "active" ? "نشط" : "غير نشط",
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `inventory_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredAndSortedItems, isArabic]);

  const toggleSort = useCallback(
    (field: "name" | "quantity" | "price") => {
      if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      else { setSortBy(field); setSortOrder("asc"); }
    },
    [sortBy, sortOrder]
  );

  const getStatusBadge = (status: string) => {
    if (status === "active") return { text: isArabic ? "نشط" : "Active", className: "bg-success-light text-success-dark" };
    return { text: isArabic ? "غير نشط" : "Inactive", className: "bg-surface-tertiary text-text-secondary" };
  };

  const isLowStock = (item: InventoryItem) => item.quantity < item.minQuantity;

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">{isArabic ? "المخزون" : "Inventory"}</h1>
            <p className="text-sm text-text-secondary mt-1">{isArabic ? "إدارة أصناف المخزون" : "Manage inventory items"}</p>
          </div>
          <div className="flex gap-2">
            <PrintPdfButton label={isArabic ? "طباعة PDF" : "Print PDF"} onPrint={handlePrintPDF} />
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 border border-green-600 text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition">
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <Can permission="inventory.create">
              <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                <Plus size={18} /> {isArabic ? "إضافة صنف" : "Add Item"}
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
              <input type="text" placeholder={isArabic ? "بحث بالاسم أو الكود..." : "Search by name or code..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg w-64 focus:outline-none focus:border-gold" />
            </div>
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none focus:outline-none focus:border-gold">
                {statusOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            {categories.length > 0 && (
              <div className="relative">
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none focus:outline-none focus:border-gold">
                  <option value="all">{isArabic ? "كل التصنيفات" : "All categories"}</option>
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </select>
              </div>
            )}
            {warehouses.length > 0 && (
              <div className="relative">
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
                <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none focus:outline-none focus:border-gold">
                  <option value="all">{isArabic ? "كل المخازن" : "All warehouses"}</option>
                  {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-text-secondary">{isArabic ? "ترتيب حسب:" : "Sort by:"}</span>
            <button onClick={() => toggleSort("name")} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${sortBy === "name" ? "bg-gold text-white" : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"}`}>
              {isArabic ? "الاسم" : "Name"} <ArrowUpDown size={14} />
            </button>
            <button onClick={() => toggleSort("quantity")} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${sortBy === "quantity" ? "bg-gold text-white" : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"}`}>
              {isArabic ? "الكمية" : "Quantity"} <ArrowUpDown size={14} />
            </button>
            <button onClick={() => toggleSort("price")} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${sortBy === "price" ? "bg-gold text-white" : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"}`}>
              {isArabic ? "السعر" : "Price"} <ArrowUpDown size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3">
        <p className="text-sm text-text-secondary">
          {isArabic ? `عرض ${filteredAndSortedItems.length} من ${items.length} صنف` : `Showing ${filteredAndSortedItems.length} of ${items.length} items`}
        </p>
      </div>

      <div className="p-6 pt-0">
        {loading ? (
          <DataLoader />
        ) : filteredAndSortedItems.length === 0 ? (
          <Card className="p-12 text-center">
            <Package size={64} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">{isArabic ? "لا يوجد أصناف مطابقة للبحث" : "No matching items found"}</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedItems.map((item) => {
              const status = getStatusBadge(item.status);
              const lowStock = isLowStock(item);
              return (
                <Card key={item.id} hover className={`p-5 ${lowStock ? "border-l-4 border-l-red-400" : ""}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${lowStock ? "bg-danger-light" : "bg-primary/10"}`}>
                        <Package className={`w-6 h-6 ${lowStock ? "text-danger" : "text-primary"}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-primary">{item.name}</h3>
                        <p className="text-sm text-gold">{item.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Can permission="approvals.create">
                        <button onClick={() => openApprovalModal(item)} className="p-1 text-text-muted hover:text-gold" title={isArabic ? "طلب موافقة" : "Request Approval"}><ClipboardCheck size={16} /></button>
                      </Can>
                      <Can permission="inventory.update">
                        <button onClick={() => openEditModal(item)} className="p-1 text-text-muted hover:text-info"><Edit2 size={16} /></button>
                      </Can>
                      <Can permission="inventory.delete">
                        <button onClick={() => { setDeletingId(item.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger"><Trash2 size={16} /></button>
                      </Can>
                    </div>
                  </div>
                  {lowStock && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-danger bg-danger-light px-2 py-1 rounded">
                      <AlertTriangle size={12} />
                      {isArabic ? "المخزون منخفض" : "Low stock"}
                    </div>
                  )}
                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    {item.categoryName && (
                      <div className="flex items-center gap-2"><span className="font-semibold text-text-primary">{isArabic ? "التصنيف" : "Category"}:</span><span>{item.categoryName}</span></div>
                    )}
                    {item.warehouseId && (
                      <div className="flex items-center gap-2"><span className="font-semibold text-text-primary">{isArabic ? "المخزن" : "Warehouse"}:</span><Link href={`/${locale}/warehouses/${item.warehouseId}`} className="text-primary hover:text-gold hover:underline">{warehouses.find((w) => w.id === item.warehouseId)?.name || item.warehouseId}</Link></div>
                    )}
                    <div className="flex items-center gap-2"><span className="font-semibold text-text-primary">{isArabic ? "الوحدة" : "Unit"}:</span><span>{item.unit || "—"}</span></div>
                    <div className="flex items-center gap-2"><span className="font-semibold text-text-primary">{isArabic ? "الكمية" : "Qty"}:</span><span className={lowStock ? "text-danger font-bold" : ""}>{item.quantity}</span></div>
                    <div className="flex items-center gap-2"><span className="font-semibold text-text-primary">{isArabic ? "الحد الأدنى" : "Min Qty"}:</span><span>{item.minQuantity}</span></div>
                    <div className="flex items-center gap-2"><span className="font-semibold text-text-primary">{isArabic ? "السعر" : "Price"}:</span><span>{item.price.toFixed(2)}</span></div>
                    <div className="flex items-center gap-2"><span className="font-semibold text-text-primary">{isArabic ? "الوصف" : "Desc"}:</span><span className="truncate">{item.description || "—"}</span></div>
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
                {editingItem ? (isArabic ? "تعديل الصنف" : "Edit Item") : (isArabic ? "إضافة صنف جديد" : "Add New Item")}
              </h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input type="text" name="code" placeholder={isArabic ? "كود الصنف" : "Item Code"} value={form.code} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <input type="text" name="name" placeholder={isArabic ? "اسم الصنف" : "Item Name"} value={form.name} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <select name="categoryId" value={form.categoryId} onChange={handleInputChange} className="w-full p-3 border rounded-xl">
                <option value="">{isArabic ? "— بدون تصنيف —" : "— No category —"}</option>
                {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
              {warehouses.length > 0 && (
                <select name="warehouseId" value={form.warehouseId} onChange={handleInputChange} className="w-full p-3 border rounded-xl">
                  <option value="">{isArabic ? "— بدون مخزن —" : "— No warehouse —"}</option>
                  {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                </select>
              )}
              <textarea name="description" placeholder={isArabic ? "الوصف" : "Description"} value={form.description} onChange={handleInputChange} className="w-full p-3 border rounded-xl" rows={2} />
              <input type="text" name="unit" placeholder={isArabic ? "الوحدة (مثل: قطعة، كجم)" : "Unit (e.g. piece, kg)"} value={form.unit} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="number" name="quantity" placeholder={isArabic ? "الكمية" : "Quantity"} value={form.quantity} onChange={handleInputChange} className="w-full p-3 border rounded-xl" min="0" />
              {!editingItem && (
                <input type="text" name="reason" placeholder={isArabic ? "السبب (توريد / افتتاح رصيد)" : "Reason (supply / opening balance)"} value={form.reason} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              )}
              <input type="number" name="minQuantity" placeholder={isArabic ? "الحد الأدنى للكمية" : "Min Quantity"} value={form.minQuantity} onChange={handleInputChange} className="w-full p-3 border rounded-xl" min="0" />
              <input type="number" step="0.01" name="price" placeholder={isArabic ? "السعر" : "Price"} value={form.price} onChange={handleInputChange} className="w-full p-3 border rounded-xl" min="0" />
              <select name="status" value={form.status} onChange={handleInputChange} className="w-full p-3 border rounded-xl">
                <option value="active">{isArabic ? "نشط" : "Active"}</option>
                <option value="inactive">{isArabic ? "غير نشط" : "Inactive"}</option>
              </select>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{editingItem ? (isArabic ? "تحديث" : "Update") : (isArabic ? "حفظ" : "Save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">{isArabic ? "طلب موافقة مخزون" : "Inventory Approval Request"}</h2>
              <button onClick={() => { setShowApprovalModal(false); setApprovalItem(null); }}><X size={24} className="text-text-muted" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "الصنف" : "Item"}</label>
                <select
                  value={approvalItem?.id ?? ""}
                  onChange={(e) => { const item = items.find((i) => i.id === e.target.value); setApprovalItem(item ?? null); }}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  required
                >
                  <option value="">{isArabic ? "اختر صنفاً..." : "Select an item..."}</option>
                  {items.map((item) => (<option key={item.id} value={item.id}>{item.code} - {item.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "نوع الإرسال" : "Submission Type"}</label>
                <select
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value as "draft" | "pending")}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="pending">{isArabic ? "إرسال مباشر" : "Submit directly"}</option>
                  <option value="draft">{isArabic ? "حفظ كمسودة" : "Save as draft"}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "ملاحظات" : "Comment"}</label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  rows={3}
                  placeholder={isArabic ? "ملاحظات اختيارية" : "Optional comment"}
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => { setShowApprovalModal(false); setApprovalItem(null); }} className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button onClick={handleApprovalSubmit} className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition">
                  {approvalStatus === "draft" ? (isArabic ? "حفظ مسودة" : "Save Draft") : (isArabic ? "إرسال" : "Submit")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b"><h2 className="text-xl font-bold text-primary">{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</h2></div>
            <div className="p-5">
              <p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذا الصنف؟" : "Are you sure you want to delete this item?"}</p>
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
