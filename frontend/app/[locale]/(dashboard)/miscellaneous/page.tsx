/* eslint-disable */
"use client";

import { useToast } from "@/components/ui/Toast";
import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import { Can } from '@/components/Can';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Filter,
  Download,
  Printer,
  DollarSign,
  Building2,
} from "lucide-react";
import { miscellaneousService, type Miscellaneous, type CreateMiscellaneousData } from "@/services/miscellaneous.service";
import { projectService, type Project } from "@/services/project.service";
import { printAsPDF } from "@/lib/printUtils";

export default function MiscellaneousPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [records, setRecords] = useState<Miscellaneous[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Miscellaneous | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [form, setForm] = useState({
    projectId: "",
    description: "",
    amount: "0",
    category: "other",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const categoryOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "food", label: isArabic ? "طعام" : "Food" },
    { value: "transport", label: isArabic ? "مواصلات" : "Transport" },
    { value: "tools", label: isArabic ? "أدوات" : "Tools" },
    { value: "other", label: isArabic ? "أخرى" : "Other" },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsData, projectsData] = await Promise.all([
        miscellaneousService.list(),
        projectService.getProjects(),
      ]);
      setRecords(recordsData);
      setProjects(projectsData);
    } catch {
      showToast(isArabic ? "خطأ في تحميل البيانات" : "Error loading data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProjectName = (projectId: string) => projects.find((p) => p.id === projectId)?.name || projectId;

  const filteredRecords = useMemo(() => {
    let filtered = [...records];
    if (categoryFilter !== "all") filtered = filtered.filter((r) => r.category === categoryFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((r) => r.description.toLowerCase().includes(term) || r.notes.toLowerCase().includes(term));
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, searchTerm, categoryFilter]);

  const openAddModal = () => {
    setEditingRecord(null);
    setForm({ projectId: "", description: "", amount: "0", category: "other", date: new Date().toISOString().split("T")[0], notes: "" });
    setShowModal(true);
  };

  const openEditModal = (record: Miscellaneous) => {
    setEditingRecord(record);
    setForm({
      projectId: record.projectId,
      description: record.description,
      amount: record.amount.toString(),
      category: record.category,
      date: record.date.split("T")[0],
      notes: record.notes,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectId || !form.description) { showToast(isArabic ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields", "error"); return; }
    try {
      const payload: CreateMiscellaneousData = {
        projectId: form.projectId,
        description: form.description,
        amount: parseFloat(form.amount) || 0,
        category: form.category,
        date: form.date,
        notes: form.notes,
      };
      if (editingRecord) {
        await miscellaneousService.update(editingRecord.id, payload);
        showToast(isArabic ? "تم التحديث" : "Updated", "success");
      } else {
        await miscellaneousService.create(payload);
        showToast(isArabic ? "تم الإضافة" : "Added", "success");
      }
      setShowModal(false);
      setEditingRecord(null);
      await fetchData();
    } catch {
      showToast(isArabic ? "خطأ في الحفظ" : "Error saving", "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await miscellaneousService.remove(deletingId);
      showToast(isArabic ? "تم الحذف" : "Deleted", "success");
      setShowDeleteConfirm(false);
      setDeletingId(null);
      await fetchData();
    } catch {
      showToast(isArabic ? "خطأ في الحذف" : "Error deleting", "error");
    }
  };

  const exportCsv = () => {
    const headers = [isArabic ? "المشروع" : "Project", isArabic ? "الوصف" : "Description", isArabic ? "المبلغ" : "Amount", isArabic ? "التصنيف" : "Category", isArabic ? "التاريخ" : "Date"];
    const rows = filteredRecords.map((r) => [getProjectName(r.projectId), r.description, r.amount.toString(), r.category, r.date]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `miscellaneous_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم التصدير" : "Exported", "success");
  };

  const handlePrint = () => {
    const headers = [isArabic ? "المشروع" : "Project", isArabic ? "الوصف" : "Description", isArabic ? "المبلغ" : "Amount", isArabic ? "التصنيف" : "Category", isArabic ? "التاريخ" : "Date"];
    const rows = filteredRecords.map((r) => [getProjectName(r.projectId), r.description, r.amount.toString(), categoryOptions.find((c) => c.value === r.category)?.label || r.category, r.date]);
    printAsPDF(rows, headers, isArabic ? "مصروفات متنوعة" : "Miscellaneous Report", isArabic);
  };

  const totalAmount = filteredRecords.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {ToastComponent}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{isArabic ? "مصروفات متنوعة" : "Miscellaneous"}</h1>
          <p className="text-sm text-text-muted mt-1">{isArabic ? "إدارة المصروفات المتنوعة للمشاريع" : "Manage miscellaneous project expenses"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border border-info text-info rounded-lg hover:bg-info hover:text-white transition"><Printer size={18} /> PDF</button>
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-success text-success rounded-lg hover:bg-success hover:text-white transition"><Download size={18} /> CSV</button>
          <Can permission="miscellaneous.create">
            <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"><Plus size={18} /> {isArabic ? "إضافة" : "Add"}</button>
          </Can>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-gold/10"><DollarSign size={20} className="text-gold" /></div>
          <div>
            <p className="text-xs text-text-muted">{isArabic ? "إجمالي المصروفات" : "Total Expenses"}</p>
            <p className="text-lg font-bold text-text-primary">{totalAmount.toLocaleString()} {isArabic ? "ج.م" : "EGP"}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder={isArabic ? "بحث..." : "Search..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pr-9 pl-4 py-2 border border-border rounded-lg focus:outline-none focus:border-gold bg-surface text-text-primary" />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="pr-9 pl-4 py-2 border border-border rounded-lg appearance-none bg-surface text-text-primary">
              {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-20 text-text-muted">{isArabic ? "جاري التحميل..." : "Loading..."}</div>
      ) : filteredRecords.length === 0 ? (
        <Card className="p-12 text-center">
          <DollarSign size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
          <p className="text-text-secondary">{isArabic ? "لا توجد مصروفات" : "No miscellaneous records"}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => (
            <Card key={record.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-surface-tertiary">
                    <Building2 size={18} className="text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{record.description}</p>
                    <p className="text-xs text-text-muted">{getProjectName(record.projectId)} — {new Date(record.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-primary">{record.amount.toLocaleString()} {isArabic ? "ج.م" : "EGP"}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-tertiary text-text-muted">
                      {categoryOptions.find((c) => c.value === record.category)?.label || record.category}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Can permission="miscellaneous.update">
                      <button onClick={() => openEditModal(record)} className="p-1 text-text-muted hover:text-text-primary"><Edit2 size={14} /></button>
                    </Can>
                    <Can permission="miscellaneous.delete">
                      <button onClick={() => { setDeletingId(record.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger"><Trash2 size={14} /></button>
                    </Can>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold">{editingRecord ? (isArabic ? "تعديل" : "Edit") : (isArabic ? "إضافة مصروف" : "Add Expense")}</h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="w-full p-3 border rounded-xl" required>
                <option value="">{isArabic ? "اختر المشروع" : "Select Project"}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="text" placeholder={isArabic ? "الوصف" : "Description"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-3 border rounded-xl" required />
              <input type="number" step="0.01" placeholder={isArabic ? "المبلغ" : "Amount"} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full p-3 border rounded-xl" required />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full p-3 border rounded-xl">
                {categoryOptions.filter((c) => c.value !== "all").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full p-3 border rounded-xl" />
              <textarea placeholder={isArabic ? "ملاحظات" : "Notes"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full p-3 border rounded-xl resize-none" rows={2} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{editingRecord ? (isArabic ? "تحديث" : "Update") : (isArabic ? "حفظ" : "Save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b"><h2 className="text-xl font-bold text-danger">{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</h2></div>
            <div className="p-5">
              <p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذا السجل؟" : "Are you sure?"}</p>
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
