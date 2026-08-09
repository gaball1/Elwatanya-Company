/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import { Can } from '@/components/Can';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  Printer,
} from "lucide-react";
import { clientService, type Client } from "@/services/client.service";
import { useToast } from "@/components/ui/Toast";
import { printAsPDF } from "@/lib/printUtils";

export default function ClientsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "joinDate">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await clientService.list();
      setClients(data);
    } catch (error) {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    joinDate: new Date().toISOString().split("T")[0],
    status: "active",
  });

  const statusOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "active", label: isArabic ? "نشط" : "Active" },
    { value: "inactive", label: isArabic ? "غير نشط" : "Inactive" },
  ];

  const filteredAndSortedClients = useMemo(() => {
    let filtered = [...clients];
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.phone.includes(term) ||
          c.contactPerson?.toLowerCase().includes(term)
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
  }, [clients, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const openAddModal = useCallback(() => {
    setEditingClient(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      contactPerson: "",
      joinDate: new Date().toISOString().split("T")[0],
      status: "active",
    });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address || "",
      contactPerson: client.contactPerson || "",
      joinDate: client.joinDate ? client.joinDate.split("T")[0] : new Date().toISOString().split("T")[0],
      status: client.status,
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload = {
          ...form,
          joinDate: form.joinDate || undefined,
        };
        if (editingClient) {
          await clientService.update(editingClient.id, payload);
          showToast(isArabic ? "تم تحديث بيانات العميل" : "Client updated", "success");
        } else {
          await clientService.create(payload);
          showToast(isArabic ? "تم إضافة العميل بنجاح" : "Client added", "success");
        }
        await fetchClients();
      } catch (error: any) {
        showToast(error?.message || (isArabic ? "حدث خطأ" : "An error occurred"), "error");
      }
      setShowModal(false);
      setEditingClient(null);
    },
    [form, editingClient, isArabic, fetchClients]
  );

  const handleDelete = useCallback(async () => {
    if (deletingId) {
      try {
        await clientService.remove(deletingId);
        await fetchClients();
        showToast(isArabic ? "تم حذف العميل" : "Client deleted", "success");
      } catch (error: any) {
        showToast(error?.message || "Error", "error");
      }
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  }, [deletingId, isArabic, fetchClients]);

  const handlePrintPDF = useCallback(() => {
    const headers = [
      isArabic ? "اسم العميل" : "Client Name",
      isArabic ? "البريد الإلكتروني" : "Email",
      isArabic ? "الهاتف" : "Phone",
      isArabic ? "العنوان" : "Address",
      isArabic ? "جهة الاتصال" : "Contact Person",
      isArabic ? "تاريخ التسجيل" : "Join Date",
      isArabic ? "الحالة" : "Status",
    ];
    const rows = filteredAndSortedClients.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.address || "—",
      c.contactPerson || "—",
      c.joinDate || "—",
      c.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive"),
    ]);
    printAsPDF(rows, headers, isArabic ? "تقرير العملاء" : "Clients Report", isArabic);
  }, [filteredAndSortedClients, isArabic]);

  const exportToExcel = useCallback(() => {
    const headers = ["اسم العميل", "البريد", "الهاتف", "العنوان", "جهة الاتصال", "تاريخ التسجيل", "الحالة"];
    const rows = filteredAndSortedClients.map((c) => [
      c.name, c.email, c.phone, c.address || "", c.contactPerson || "",
      c.joinDate || "", c.status === "active" ? "نشط" : "غير نشط",
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `clients_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredAndSortedClients, isArabic]);

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
            <h1 className="text-2xl font-bold text-primary">{isArabic ? "العملاء" : "Clients"}</h1>
            <p className="text-sm text-text-secondary mt-1">{isArabic ? "إدارة بيانات العملاء وجهات الإسناد" : "Manage client data"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrintPDF} className="flex items-center gap-2 px-4 py-2 border border-info text-info rounded-lg hover:bg-info hover:text-white transition">
              <Printer size={18} /> {isArabic ? "طباعة PDF" : "Print PDF"}
            </button>
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition">
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <Can permission="clients.create">
              <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                <Plus size={18} /> {isArabic ? "إضافة عميل" : "Add Client"}
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
          {isArabic ? `عرض ${filteredAndSortedClients.length} من ${clients.length} عميل` : `Showing ${filteredAndSortedClients.length} of ${clients.length} clients`}
        </p>
      </div>

      <div className="p-6 pt-0">
        {loading ? (
          <Card className="p-12 text-center"><p className="text-text-secondary">{isArabic ? "جاري التحميل..." : "Loading..."}</p></Card>
        ) : filteredAndSortedClients.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 size={64} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">{isArabic ? "لا يوجد عملاء مطابقين للبحث" : "No matching clients found"}</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedClients.map((client) => {
              const status = getStatusBadge(client.status);
              return (
                <Card key={client.id} hover className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-primary">{client.name}</h3>
                        <p className="text-sm text-gold">{client.contactPerson || (isArabic ? "جهة إسناد" : "Client")}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Can permission="clients.update">
                        <button onClick={() => openEditModal(client)} className="p-1 text-text-muted hover:text-info"><Edit2 size={16} /></button>
                      </Can>
                      <Can permission="clients.delete">
                        <button onClick={() => { setDeletingId(client.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger"><Trash2 size={16} /></button>
                      </Can>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gold" /><span>{client.email}</span></div>
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gold" /><span>{client.phone}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /><span>{client.address || "—"}</span></div>
                    <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-gold" /><span>{client.contactPerson || "—"}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" /><span>{isArabic ? "تاريخ التسجيل" : "Join Date"}: {client.joinDate || "—"}</span></div>
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
                {editingClient ? (isArabic ? "تعديل بيانات العميل" : "Edit Client") : (isArabic ? "إضافة عميل جديد" : "Add New Client")}
              </h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input type="text" name="name" placeholder={isArabic ? "اسم العميل" : "Client Name"} value={form.name} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <input type="email" name="email" placeholder={isArabic ? "البريد الإلكتروني" : "Email"} value={form.email} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="tel" name="phone" placeholder={isArabic ? "رقم الهاتف" : "Phone"} value={form.phone} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="text" name="address" placeholder={isArabic ? "العنوان" : "Address"} value={form.address} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="text" name="contactPerson" placeholder={isArabic ? "جهة الاتصال" : "Contact Person"} value={form.contactPerson} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="date" name="joinDate" value={form.joinDate} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <select name="status" value={form.status} onChange={handleInputChange} className="w-full p-3 border rounded-xl">
                <option value="active">{isArabic ? "نشط" : "Active"}</option>
                <option value="inactive">{isArabic ? "غير نشط" : "Inactive"}</option>
              </select>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{editingClient ? (isArabic ? "تحديث" : "Update") : (isArabic ? "حفظ" : "Save")}</button>
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
              <p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذا العميل؟" : "Are you sure you want to delete this client?"}</p>
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
