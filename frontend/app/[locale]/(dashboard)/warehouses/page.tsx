/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import DataLoader from "@/components/shared/DataLoader";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import { Can } from '@/components/Can';
import {
  Warehouse,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  MapPin,
  Hash,
} from "lucide-react";
import { warehouseService, type Warehouse as WarehouseType } from "@/services/warehouse.service";
import { useToast } from "@/components/ui/Toast";
import { printAsPDF } from "@/lib/printUtils";

export default function WarehousesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "code">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await warehouseService.list();
      setWarehouses(data);
    } catch (error) {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const [form, setForm] = useState({
    code: "",
    name: "",
    location: "",
    status: "active",
  });

  const statusOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "active", label: isArabic ? "نشط" : "Active" },
    { value: "inactive", label: isArabic ? "غير نشط" : "Inactive" },
  ];

  const filteredAndSortedWarehouses = useMemo(() => {
    let filtered = [...warehouses];
    if (statusFilter !== "all") {
      filtered = filtered.filter((w) => w.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.name.toLowerCase().includes(term) ||
          w.code.toLowerCase().includes(term) ||
          w.location?.toLowerCase().includes(term)
      );
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") comparison = a.name.localeCompare(b.name);
      else if (sortBy === "code") comparison = a.code.localeCompare(b.code);
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [warehouses, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const openAddModal = useCallback(() => {
    setEditingWarehouse(null);
    setForm({ code: "", name: "", location: "", status: "active" });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((warehouse: WarehouseType) => {
    setEditingWarehouse(warehouse);
    setForm({
      code: warehouse.code,
      name: warehouse.name,
      location: warehouse.location || "",
      status: warehouse.status,
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        if (editingWarehouse) {
          await warehouseService.update(editingWarehouse.id, form);
          showToast(isArabic ? "تم تحديث بيانات المستودع" : "Warehouse updated", "success");
        } else {
          await warehouseService.create(form);
          showToast(isArabic ? "تم إضافة المستودع بنجاح" : "Warehouse added", "success");
        }
        await fetchWarehouses();
      } catch (error: any) {
        showToast(error?.message || (isArabic ? "حدث خطأ" : "An error occurred"), "error");
      }
      setShowModal(false);
      setEditingWarehouse(null);
    },
    [form, editingWarehouse, isArabic, fetchWarehouses]
  );

  const handleDelete = useCallback(async () => {
    if (deletingId) {
      try {
        await warehouseService.remove(deletingId);
        await fetchWarehouses();
        showToast(isArabic ? "تم حذف المستودع" : "Warehouse deleted", "success");
      } catch (error: any) {
        showToast(error?.message || "Error", "error");
      }
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  }, [deletingId, isArabic, fetchWarehouses]);

  const handlePrintPDF = useCallback((logoUrl?: string) => {
    const headers = [
      isArabic ? "الكود" : "Code",
      isArabic ? "اسم المستودع" : "Name",
      isArabic ? "الموقع" : "Location",
      isArabic ? "الحالة" : "Status",
    ];
    const rows = filteredAndSortedWarehouses.map((w) => [
      w.code,
      w.name,
      w.location || "—",
      w.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive"),
    ]);
    printAsPDF(rows, headers, isArabic ? "تقرير المستودعات" : "Warehouses Report", isArabic, { logoUrl });
  }, [filteredAndSortedWarehouses, isArabic]);

  const exportToExcel = useCallback(() => {
    const headers = ["الكود", "اسم المستودع", "الموقع", "الحالة"];
    const rows = filteredAndSortedWarehouses.map((w) => [
      w.code, w.name, w.location || "", w.status === "active" ? "نشط" : "غير نشط",
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `warehouses_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredAndSortedWarehouses, isArabic]);

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
            <h1 className="text-2xl font-bold text-primary">{isArabic ? "المستودعات" : "Warehouses"}</h1>
            <p className="text-sm text-text-secondary mt-1">{isArabic ? "إدارة المستودعات والمخازن" : "Manage warehouses & storage"}</p>
          </div>
          <div className="flex gap-2">
            <PrintPdfButton label={isArabic ? "طباعة PDF" : "Print PDF"} onPrint={handlePrintPDF} />
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 border border-green-600 text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition">
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <Can permission="warehouses.create">
              <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                <Plus size={18} /> {isArabic ? "إضافة مستودع" : "Add Warehouse"}
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
              <input type="text" placeholder={isArabic ? "بحث بالاسم أو الكود أو الموقع..." : "Search by name, code, location..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg w-64 focus:outline-none focus:border-gold" />
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
              {isArabic ? "الكود" : "Code"} <ArrowUpDown size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3">
        <p className="text-sm text-text-secondary">
          {isArabic ? `عرض ${filteredAndSortedWarehouses.length} من ${warehouses.length} مستودع` : `Showing ${filteredAndSortedWarehouses.length} of ${warehouses.length} warehouses`}
        </p>
      </div>

      <div className="p-6 pt-0">
        {loading ? (
          <DataLoader />
        ) : filteredAndSortedWarehouses.length === 0 ? (
          <Card className="p-12 text-center">
            <Warehouse size={64} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">{isArabic ? "لا يوجد مستودعات مطابقة للبحث" : "No matching warehouses found"}</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedWarehouses.map((warehouse) => {
              const status = getStatusBadge(warehouse.status);
              return (
                <Card key={warehouse.id} hover className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Warehouse className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <Link href={`/${locale}/warehouses/${warehouse.id}`}>
                          <h3 className="text-lg font-bold text-primary hover:text-gold transition">{warehouse.name}</h3>
                        </Link>
                        <p className="text-sm text-gold">{warehouse.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Can permission="warehouses.update">
                        <button onClick={() => openEditModal(warehouse)} className="p-1 text-text-muted hover:text-info"><Edit2 size={16} /></button>
                      </Can>
                      <Can permission="warehouses.delete">
                        <button onClick={() => { setDeletingId(warehouse.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger"><Trash2 size={16} /></button>
                      </Can>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    <div className="flex items-center gap-2"><Hash className="w-4 h-4 text-gold" /><span>{isArabic ? "الكود" : "Code"}: {warehouse.code}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /><span>{warehouse.location || "—"}</span></div>
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
                {editingWarehouse ? (isArabic ? "تعديل بيانات المستودع" : "Edit Warehouse") : (isArabic ? "إضافة مستودع جديد" : "Add New Warehouse")}
              </h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input type="text" name="code" placeholder={isArabic ? "كود المستودع" : "Warehouse Code"} value={form.code} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <input type="text" name="name" placeholder={isArabic ? "اسم المستودع" : "Warehouse Name"} value={form.name} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <input type="text" name="location" placeholder={isArabic ? "الموقع" : "Location"} value={form.location} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <select name="status" value={form.status} onChange={handleInputChange} className="w-full p-3 border rounded-xl">
                <option value="active">{isArabic ? "نشط" : "Active"}</option>
                <option value="inactive">{isArabic ? "غير نشط" : "Inactive"}</option>
              </select>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{editingWarehouse ? (isArabic ? "تحديث" : "Update") : (isArabic ? "حفظ" : "Save")}</button>
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
              <p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذا المستودع؟" : "Are you sure you want to delete this warehouse?"}</p>
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
