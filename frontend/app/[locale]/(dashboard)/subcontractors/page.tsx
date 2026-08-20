/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import { Can } from "@/components/Can";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  MapPin,
} from "lucide-react";
import { subcontractorService, type Subcontractor } from "@/services/subcontractor.service";
import { useToast } from "@/components/ui/Toast";
import { printAsPDF } from "@/lib/printUtils";
import DataLoader from "@/components/shared/DataLoader";

export default function SubcontractorsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [subcontractors, setSubcontractors] = useState<(Subcontractor & { projects?: string[] })[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "marginValue" | "joinDate">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [form, setForm] = useState({
    name: "",
    workType: "",
    marginType: "percentage",
    marginValue: 0,
    phone: "",
    email: "",
    address: "",
    joinDate: new Date().toISOString().split("T")[0],
    status: "active",
    projects: "",
  });

  const fetchSubcontractors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await subcontractorService.list();
      setSubcontractors(data.map(sub => ({ ...sub, projects: [] })));
    } catch {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { fetchSubcontractors(); }, [fetchSubcontractors]);

  const workTypeOptions = [
    { value: "all", label: isArabic ? "كل الأنواع" : "All Types" },
    { value: "حداد", label: isArabic ? "حداد" : "Steel Fixer" },
    { value: "نجار", label: isArabic ? "نجار" : "Carpenter" },
    { value: "سباك", label: isArabic ? "سباك" : "Plumber" },
    { value: "كهرباء", label: isArabic ? "كهرباء" : "Electrician" },
    { value: "دهان", label: isArabic ? "دهان" : "Painter" },
    { value: "محارة", label: isArabic ? "محارة" : "Plasterer" },
  ];

  const statusOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "active", label: isArabic ? "نشط" : "Active" },
    { value: "inactive", label: isArabic ? "غير نشط" : "Inactive" },
  ];

  const filteredAndSortedSubs = useMemo(() => {
    let filtered = [...subcontractors];
    if (workTypeFilter !== "all") filtered = filtered.filter((sub) => sub.workType === workTypeFilter);
    if (statusFilter !== "all") filtered = filtered.filter((sub) => sub.status === statusFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((sub) => sub.name.toLowerCase().includes(term) || sub.email?.toLowerCase().includes(term) || sub.phone.includes(term) || sub.workType.toLowerCase().includes(term));
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") comparison = a.name.localeCompare(b.name);
      else if (sortBy === "marginValue") comparison = (a.marginValue || 0) - (b.marginValue || 0);
      else if (sortBy === "joinDate") comparison = (a.joinDate ?? "").localeCompare(b.joinDate ?? "");
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [subcontractors, searchTerm, workTypeFilter, statusFilter, sortBy, sortOrder]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const openAddModal = useCallback(() => {
    setEditingSub(null);
    setForm({ name: "", workType: "", marginType: "percentage", marginValue: 0, phone: "", email: "", address: "", joinDate: new Date().toISOString().split("T")[0], status: "active", projects: "" });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((sub: any) => {
    setEditingSub(sub);
    setForm({ name: sub.name, workType: sub.workType, marginType: sub.marginType, marginValue: sub.marginValue, phone: sub.phone, email: sub.email ?? "", address: sub.address ?? "", joinDate: sub.joinDate || new Date().toISOString().split("T")[0], status: sub.status, projects: sub.projects?.join(", ") ?? "" });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        workType: form.workType,
        marginType: form.marginType,
        marginValue: Number(form.marginValue) || 0,
        phone: form.phone,
        email: form.email,
        address: form.address,
        joinDate: form.joinDate || undefined,
        status: form.status,
      };
      if (editingSub) {
        await subcontractorService.update(editingSub.id, payload);
        showToast(isArabic ? "تم تحديث بيانات المقاول" : "Subcontractor updated", "success");
      } else {
        await subcontractorService.create(payload);
        showToast(isArabic ? "تم إضافة المقاول بنجاح" : "Subcontractor added", "success");
      }
      setShowModal(false);
      setEditingSub(null);
      await fetchSubcontractors();
    } catch {
      showToast(isArabic ? "حدث خطأ في حفظ البيانات" : "Failed to save data", "error");
    }
  }, [form, editingSub, isArabic, fetchSubcontractors]);

  const handleDelete = useCallback(async () => {
    if (deletingId) {
      try {
        await subcontractorService.remove(deletingId);
        showToast(isArabic ? "تم حذف المقاول" : "Subcontractor deleted", "success");
        setShowDeleteConfirm(false);
        setDeletingId(null);
        await fetchSubcontractors();
      } catch {
        showToast(isArabic ? "حدث خطأ في حذف البيانات" : "Failed to delete data", "error");
      }
    }
  }, [deletingId, isArabic, fetchSubcontractors]);

  const handlePrintPDF = useCallback((logoUrl?: string) => {
    const headers = [isArabic ? "الاسم" : "Name", isArabic ? "نوع العمل" : "Work Type", isArabic ? "نوع المصنعية" : "Margin Type", isArabic ? "قيمة المصنعية" : "Margin Value", isArabic ? "الهاتف" : "Phone", isArabic ? "البريد" : "Email", isArabic ? "العنوان" : "Address", isArabic ? "تاريخ التسجيل" : "Join Date", isArabic ? "الحالة" : "Status"];
    const rows = filteredAndSortedSubs.map((sub: any) => [sub.name, sub.workType, sub.marginType === "percentage" ? (isArabic ? "نسبة" : "Percentage") : (isArabic ? "ثابت" : "Fixed"), sub.marginType === "percentage" ? `${sub.marginValue}%` : `${sub.marginValue} ج.م`, sub.phone, sub.email || "—", sub.address || "—", sub.joinDate || "—", sub.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive")]);
    printAsPDF(rows, headers, isArabic ? "تقرير المقاولين" : "Subcontractors Report", isArabic, { logoUrl });
  }, [filteredAndSortedSubs, isArabic]);

  const exportToExcel = useCallback(() => {
    const headers = ["الاسم", "نوع العمل", "نوع المصنعية", "قيمة المصنعية", "الهاتف", "البريد", "العنوان", "تاريخ التسجيل", "الحالة"];
    const rows = filteredAndSortedSubs.map((sub: any) => [sub.name, sub.workType, sub.marginType === "percentage" ? "نسبة" : "ثابت", sub.marginType === "percentage" ? `${sub.marginValue}%` : `${sub.marginValue} ج.م`, sub.phone, sub.email ?? "", sub.address ?? "", sub.joinDate ?? "", sub.status === "active" ? "نشط" : "غير نشط"]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `subcontractors_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredAndSortedSubs, isArabic]);

  const toggleSort = useCallback((field: "name" | "marginValue" | "joinDate") => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("asc"); }
  }, [sortBy, sortOrder]);

  const getStatusBadge = (status: string) => {
    if (status === "active") return { text: isArabic ? "نشط" : "Active", className: "bg-success-light text-success-dark" };
    return { text: isArabic ? "غير نشط" : "Inactive", className: "bg-surface-tertiary text-text-secondary" };
  };

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div><h1 className="text-2xl font-bold text-primary">{isArabic ? "المقاولين الباطنين" : "Subcontractors"}</h1><p className="text-sm text-text-secondary mt-1">{isArabic ? "إدارة بيانات المقاولين والمصنعيات" : "Manage subcontractor data and margins"}</p></div>
          <div className="flex gap-2">
            <PrintPdfButton label={isArabic ? "طباعة PDF" : "Print PDF"} onPrint={handlePrintPDF} />
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 border border-green-600 text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition"><Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}</button>
            <Can permission="subcontractors.create"><button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"><Plus size={18} /> {isArabic ? "إضافة مقاول" : "Add Subcontractor"}</button></Can>
          </div>
        </div>
      </div>

      <div className="bg-surface border-b px-6 py-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative"><Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" /><input type="text" placeholder={isArabic ? "بحث..." : "Search..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg w-64 focus:outline-none focus:border-gold" /></div>
            <div className="relative"><Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" /><select value={workTypeFilter} onChange={(e) => setWorkTypeFilter(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none focus:outline-none focus:border-gold">{workTypeOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div>
            <div className="relative"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-gold">{statusOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-text-secondary">{isArabic ? "ترتيب حسب:" : "Sort by:"}</span>
            <button onClick={() => toggleSort("name")} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${sortBy === "name" ? "bg-gold text-white" : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"}`}>{isArabic ? "الاسم" : "Name"} <ArrowUpDown size={14} /></button>
            <button onClick={() => toggleSort("marginValue")} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${sortBy === "marginValue" ? "bg-gold text-white" : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"}`}>{isArabic ? "المصنعية" : "Margin"} <ArrowUpDown size={14} /></button>
            <button onClick={() => toggleSort("joinDate")} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${sortBy === "joinDate" ? "bg-gold text-white" : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"}`}>{isArabic ? "تاريخ التسجيل" : "Join Date"} <ArrowUpDown size={14} /></button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3"><p className="text-sm text-text-secondary">{loading ? (isArabic ? "جاري التحميل..." : "Loading...") : isArabic ? `عرض ${filteredAndSortedSubs.length} من ${subcontractors.length} مقاول` : `Showing ${filteredAndSortedSubs.length} of ${subcontractors.length} subcontractors`}</p></div>

      <div className="p-6 pt-0">
        {loading ? (
          <DataLoader />
        ) : filteredAndSortedSubs.length === 0 ? (
          <Card className="p-12 text-center"><Users size={64} className="mx-auto text-text-muted mb-4" /><p className="text-text-secondary">{isArabic ? "لا يوجد مقاولين مطابقين للبحث" : "No matching subcontractors found"}</p></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedSubs.map((sub) => {
              const status = getStatusBadge(sub.status);
              return (
                <Card key={sub.id} hover className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3"><div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center"><Users className="w-6 h-6 text-primary" /></div><div><h3 className="text-lg font-bold text-primary">{sub.name}</h3><p className="text-sm text-gold">{sub.workType}</p></div></div>
                    <div className="flex gap-1"><Can permission="subcontractors.update"><button onClick={() => openEditModal(sub)} className="p-1 text-text-muted hover:text-info"><Edit2 size={16} /></button></Can><Can permission="subcontractors.delete"><button onClick={() => { setDeletingId(sub.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger"><Trash2 size={16} /></button></Can></div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gold" /><span>{sub.phone}</span></div>
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gold" /><span>{sub.email || "—"}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /><span>{sub.address || "—"}</span></div>
                    <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-gold" /><span>{sub.projects?.join(", ") || "—"}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" /><span>{isArabic ? "تاريخ التسجيل" : "Join Date"}: {sub.joinDate || "—"}</span></div>
                    <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-gold" /><span>{sub.marginType === "percentage" ? `${sub.marginValue}%` : `${sub.marginValue} ج.م`}</span></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-light flex justify-between items-center"><span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>{status.text}</span><span className="text-xs text-text-muted">{sub.marginType === "percentage" ? (isArabic ? "نسبة" : "Percentage") : (isArabic ? "قيمة ثابتة" : "Fixed")}</span></div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b"><h2 className="text-xl font-bold text-primary">{editingSub ? (isArabic ? "تعديل بيانات المقاول" : "Edit Subcontractor") : (isArabic ? "إضافة مقاول جديد" : "Add New Subcontractor")}</h2><button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button></div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input type="text" name="name" placeholder={isArabic ? "اسم المقاول" : "Subcontractor Name"} value={form.name} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <select name="workType" value={form.workType} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required><option value="">{isArabic ? "-- اختر نوع العمل --" : "-- Select Work Type --"}</option>{workTypeOptions.filter((w) => w.value !== "all").map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>
              <div className="flex gap-3"><select name="marginType" value={form.marginType} onChange={handleInputChange} className="flex-1 p-3 border rounded-xl"><option value="percentage">{isArabic ? "نسبة" : "Percentage"}</option><option value="fixed">{isArabic ? "قيمة ثابتة" : "Fixed"}</option></select><input type="number" name="marginValue" placeholder={isArabic ? "القيمة" : "Value"} value={form.marginValue ?? ""} onChange={handleInputChange} className="flex-1 p-3 border rounded-xl" required /></div>
              <input type="tel" name="phone" placeholder={isArabic ? "رقم الهاتف" : "Phone"} value={form.phone} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <input type="email" name="email" placeholder={isArabic ? "البريد الإلكتروني" : "Email"} value={form.email} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="text" name="address" placeholder={isArabic ? "العنوان" : "Address"} value={form.address} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <input type="date" name="joinDate" value={form.joinDate} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <select name="status" value={form.status} onChange={handleInputChange} className="w-full p-3 border rounded-xl"><option value="active">{isArabic ? "نشط" : "Active"}</option><option value="inactive">{isArabic ? "غير نشط" : "Inactive"}</option></select>
              <input type="text" name="projects" placeholder={isArabic ? "المشاريع (مفصولة بفواصل)" : "Projects (comma separated)"} value={form.projects} onChange={handleInputChange} className="w-full p-3 border rounded-xl" />
              <div className="flex gap-3"><button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button><button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{editingSub ? (isArabic ? "تحديث" : "Update") : (isArabic ? "حفظ" : "Save")}</button></div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md"><div className="p-5 border-b"><h2 className="text-xl font-bold text-primary">{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</h2></div><div className="p-5"><p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذا المقاول؟" : "Are you sure you want to delete this subcontractor?"}</p><div className="flex gap-3 mt-6"><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button><button onClick={handleDelete} className="flex-1 px-4 py-2 bg-danger text-white rounded-xl">{isArabic ? "حذف" : "Delete"}</button></div></div></div>
        </div>
      )}
    </div>
  );
}