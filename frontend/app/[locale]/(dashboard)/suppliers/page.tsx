/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import { Can } from '@/components/Can';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Package,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  CreditCard,
  Printer,
} from "lucide-react";
import { supplierService, type Supplier } from "@/services/supplier.service";
import { useToast } from "@/components/ui/Toast";
import { printAsPDF } from "@/lib/printUtils";

export default function SuppliersPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "joinDate">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supplierService.list();
      setSuppliers(data);
    } catch (error) {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    products: "",
    paymentTerms: "",
    joinDate: new Date().toISOString().split("T")[0],
    status: "active",
  });

  const statusOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "active", label: isArabic ? "نشط" : "Active" },
    { value: "inactive", label: isArabic ? "غير نشط" : "Inactive" },
  ];

  const filteredAndSortedSuppliers = useMemo(() => {
    let filtered = [...suppliers];
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term) ||
          s.phone.includes(term) ||
          s.contactPerson?.toLowerCase().includes(term) ||
          s.products?.some((p: string) => p.toLowerCase().includes(term))
      );
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") comparison = a.name.localeCompare(b.name);
      else if (sortBy === "joinDate")
        comparison = (a.joinDate || "").localeCompare(b.joinDate || "");
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [suppliers, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const openAddModal = useCallback(() => {
    setEditingSupplier(null);
    setForm({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      products: "",
      paymentTerms: "",
      joinDate: new Date().toISOString().split("T")[0],
      status: "active",
    });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address || "",
      products: supplier.products?.join(", ") || "",
      paymentTerms: supplier.paymentTerms || "",
      joinDate: supplier.joinDate ? supplier.joinDate.split("T")[0] : new Date().toISOString().split("T")[0],
      status: supplier.status,
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const productsArray = form.products
        ? form.products.split(",").map((p) => p.trim())
        : [];

      try {
        const payload = {
          name: form.name,
          contactPerson: form.contactPerson || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          products: productsArray,
          paymentTerms: form.paymentTerms || undefined,
          joinDate: form.joinDate || undefined,
          status: form.status,
        };

        if (editingSupplier) {
          await supplierService.update(editingSupplier.id, payload);
          showToast(isArabic ? "تم تحديث بيانات المورد" : "Supplier updated", "success");
        } else {
          await supplierService.create(payload);
          showToast(isArabic ? "تم إضافة المورد بنجاح" : "Supplier added", "success");
        }
        await fetchSuppliers();
      } catch (error: any) {
        showToast(error?.message || (isArabic ? "حدث خطأ" : "An error occurred"), "error");
      }
      setShowModal(false);
      setEditingSupplier(null);
    },
    [form, editingSupplier, isArabic, fetchSuppliers]
  );

  const handleDelete = useCallback(async () => {
    if (deletingId) {
      try {
        await supplierService.remove(deletingId);
        await fetchSuppliers();
        showToast(isArabic ? "تم حذف المورد" : "Supplier deleted", "success");
      } catch (error: any) {
        showToast(error?.message || "Error", "error");
      }
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  }, [deletingId, isArabic, fetchSuppliers]);

  const handlePrintPDF = useCallback(() => {
    const headers = [
      isArabic ? "اسم المورد" : "Supplier Name",
      isArabic ? "جهة الاتصال" : "Contact Person",
      isArabic ? "الهاتف" : "Phone",
      isArabic ? "البريد" : "Email",
      isArabic ? "العنوان" : "Address",
      isArabic ? "المنتجات" : "Products",
      isArabic ? "شروط الدفع" : "Payment Terms",
      isArabic ? "تاريخ التسجيل" : "Join Date",
      isArabic ? "الحالة" : "Status",
    ];
    const rows = filteredAndSortedSuppliers.map((s) => [
      s.name,
      s.contactPerson || "—",
      s.phone,
      s.email,
      s.address || "—",
      s.products?.join(", ") || "—",
      s.paymentTerms || "—",
      s.joinDate || "—",
      s.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive"),
    ]);
    printAsPDF(rows, headers, isArabic ? "تقرير الموردين" : "Suppliers Report", isArabic);
  }, [filteredAndSortedSuppliers, isArabic]);

  const exportToExcel = useCallback(() => {
    const headers = ["اسم المورد", "جهة الاتصال", "الهاتف", "البريد", "العنوان", "المنتجات", "شروط الدفع", "تاريخ التسجيل", "الحالة"];
    const rows = filteredAndSortedSuppliers.map((s) => [
      s.name, s.contactPerson || "", s.phone, s.email, s.address || "",
      s.products?.join(", ") || "", s.paymentTerms || "", s.joinDate || "",
      s.status === "active" ? "نشط" : "غير نشط",
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `suppliers_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredAndSortedSuppliers, isArabic]);

  const toggleSort = useCallback(
    (field: "name" | "joinDate") => {
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
            <h1 className="text-2xl font-bold text-primary">{isArabic ? "الموردين" : "Suppliers"}</h1>
            <p className="text-sm text-text-secondary mt-1">{isArabic ? "إدارة بيانات الموردين" : "Manage supplier data"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrintPDF} className="flex items-center gap-2 px-4 py-2 border border-info text-info rounded-lg hover:bg-info hover:text-white transition">
              <Printer size={18} /> {isArabic ? "طباعة PDF" : "Print PDF"}
            </button>
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 border border-green-600 text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition">
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <Can permission="suppliers.create">
              <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                <Plus size={18} /> {isArabic ? "إضافة مورد" : "Add Supplier"}
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
              <input type="text" placeholder={isArabic ? "بحث..." : "Search..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg w-64 focus:outline-none focus:border-gold" />
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
            <button onClick={() => toggleSort("joinDate")} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${sortBy === "joinDate" ? "bg-gold text-white" : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"}`}>
              {isArabic ? "تاريخ التسجيل" : "Join Date"} <ArrowUpDown size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3">
        <p className="text-sm text-text-secondary">
          {isArabic ? `عرض ${filteredAndSortedSuppliers.length} من ${suppliers.length} مورد` : `Showing ${filteredAndSortedSuppliers.length} of ${suppliers.length} suppliers`}
        </p>
      </div>

      <div className="p-6 pt-0">
        {loading ? (
          <Card className="p-12 text-center"><p className="text-text-secondary">{isArabic ? "جاري التحميل..." : "Loading..."}</p></Card>
        ) : filteredAndSortedSuppliers.length === 0 ? (
          <Card className="p-12 text-center">
            <Truck size={64} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">{isArabic ? "لا يوجد موردين مطابقين للبحث" : "No matching suppliers found"}</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedSuppliers.map((supplier) => {
              const status = getStatusBadge(supplier.status);
              return (
                <Card key={supplier.id} hover className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Truck className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-primary">{supplier.name}</h3>
                        <p className="text-sm text-gold">{supplier.contactPerson || (isArabic ? "مورد" : "Supplier")}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Can permission="suppliers.update">
                        <button onClick={() => openEditModal(supplier)} className="p-1 text-text-muted hover:text-info"><Edit2 size={16} /></button>
                      </Can>
                      <Can permission="suppliers.delete">
                        <button onClick={() => { setDeletingId(supplier.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger"><Trash2 size={16} /></button>
                      </Can>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gold" /><span>{supplier.phone}</span></div>
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gold" /><span>{supplier.email}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /><span>{supplier.address || "—"}</span></div>
                    <div className="flex items-center gap-2"><Package className="w-4 h-4 text-gold" /><span>{supplier.products?.join(", ") || "—"}</span></div>
                    <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-gold" /><span>{supplier.paymentTerms || "—"}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" /><span>{isArabic ? "تاريخ التسجيل" : "Join Date"}: {supplier.joinDate || "—"}</span></div>
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
                {editingSupplier ? (isArabic ? "تعديل بيانات المورد" : "Edit Supplier") : (isArabic ? "إضافة مورد جديد" : "Add New Supplier")}
              </h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input type="text" name="name" placeholder={isArabic ? "اسم المورد" : "Supplier Name"} value={form.name} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <input type="text" name="contactPerson" placeholder={isArabic ? "جهة الاتصال" : "Contact Person"} value={form.contactPerson} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="tel" name="phone" placeholder={isArabic ? "رقم الهاتف" : "Phone"} value={form.phone} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="email" name="email" placeholder={isArabic ? "البريد الإلكتروني" : "Email"} value={form.email} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="text" name="address" placeholder={isArabic ? "العنوان" : "Address"} value={form.address} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="text" name="products" placeholder={isArabic ? "المنتجات (مفصولة بفواصل)" : "Products (comma separated)"} value={form.products} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="text" name="paymentTerms" placeholder={isArabic ? "شروط الدفع" : "Payment Terms"} value={form.paymentTerms} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="date" name="joinDate" value={form.joinDate} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <select name="status" value={form.status} onChange={handleInputChange} className="w-full p-3 border rounded-xl">
                <option value="active">{isArabic ? "نشط" : "Active"}</option>
                <option value="inactive">{isArabic ? "غير نشط" : "Inactive"}</option>
              </select>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{editingSupplier ? (isArabic ? "تحديث" : "Update") : (isArabic ? "حفظ" : "Save")}</button>
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
              <p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذا المورد؟" : "Are you sure you want to delete this supplier?"}</p>
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
