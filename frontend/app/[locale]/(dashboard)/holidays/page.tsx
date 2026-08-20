/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import DataLoader from "@/components/shared/DataLoader";
import { Can } from '@/components/Can';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Filter,
  Download,
} from "lucide-react";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import { holidayService, type Holiday } from "@/services/holiday.service";
import { useToast } from "@/components/ui/Toast";
import { printAsPDF } from "@/lib/printUtils";

export default function HolidaysPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [recurringFilter, setRecurringFilter] = useState("all");

  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const data = await holidayService.list();
      setHolidays(data);
    } catch (error) {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const [form, setForm] = useState({
    name: "",
    date: "",
    description: "",
    isRecurring: false,
  });

  const recurringOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "recurring", label: isArabic ? "متكرر" : "Recurring" },
    { value: "non-recurring", label: isArabic ? "غير متكرر" : "Non-recurring" },
  ];

  const filteredHolidays = useMemo(() => {
    let filtered = [...holidays];
    if (recurringFilter === "recurring") {
      filtered = filtered.filter((h) => h.isRecurring);
    } else if (recurringFilter === "non-recurring") {
      filtered = filtered.filter((h) => !h.isRecurring);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          h.name.toLowerCase().includes(term) ||
          h.description?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [holidays, searchTerm, recurringFilter]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = e.target;
      const value = target.type === "checkbox"
        ? (target as HTMLInputElement).checked
        : target.value;
      setForm((prev) => ({ ...prev, [target.name]: value }));
    },
    []
  );

  const openAddModal = useCallback(() => {
    setEditingHoliday(null);
    setForm({ name: "", date: "", description: "", isRecurring: false });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((holiday: Holiday) => {
    setEditingHoliday(holiday);
    setForm({
      name: holiday.name,
      date: holiday.date.split("T")[0],
      description: holiday.description || "",
      isRecurring: holiday.isRecurring,
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload = {
          name: form.name,
          date: form.date,
          description: form.description || undefined,
          isRecurring: form.isRecurring,
        };
        if (editingHoliday) {
          await holidayService.update(editingHoliday.id, payload);
          showToast(isArabic ? "تم تحديث الإجازة" : "Holiday updated", "success");
        } else {
          await holidayService.create(payload);
          showToast(isArabic ? "تم إضافة الإجازة بنجاح" : "Holiday added", "success");
        }
        await fetchHolidays();
      } catch (error: any) {
        showToast(error?.message || (isArabic ? "حدث خطأ" : "An error occurred"), "error");
      }
      setShowModal(false);
      setEditingHoliday(null);
    },
    [form, editingHoliday, isArabic, fetchHolidays]
  );

  const handleDelete = useCallback(async () => {
    if (deletingId) {
      try {
        await holidayService.remove(deletingId);
        await fetchHolidays();
        showToast(isArabic ? "تم حذف الإجازة" : "Holiday deleted", "success");
      } catch (error: any) {
        showToast(error?.message || "Error", "error");
      }
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  }, [deletingId, isArabic, fetchHolidays]);

  const handlePrintPDF = useCallback((logoUrl?: string) => {
    const headers = [
      isArabic ? "اسم الإجازة" : "Holiday Name",
      isArabic ? "التاريخ" : "Date",
      isArabic ? "الوصف" : "Description",
      isArabic ? "متكرر" : "Recurring",
    ];
    const rows = filteredHolidays.map((h) => [
      h.name,
      h.date,
      h.description || "—",
      h.isRecurring ? (isArabic ? "نعم" : "Yes") : (isArabic ? "لا" : "No"),
    ]);
    printAsPDF(rows, headers, isArabic ? "تقرير الإجازات" : "Holidays Report", isArabic, { logoUrl });
  }, [filteredHolidays, isArabic]);

  const exportToExcel = useCallback(() => {
    const headers = ["اسم الإجازة", "التاريخ", "الوصف", "متكرر"];
    const rows = filteredHolidays.map((h) => [
      h.name, h.date, h.description || "", h.isRecurring ? "نعم" : "لا",
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `holidays_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredHolidays, isArabic]);

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">{isArabic ? "الإجازات" : "Holidays"}</h1>
            <p className="text-sm text-text-secondary mt-1">{isArabic ? "إدارة الإجازات والعطلات" : "Manage holidays"}</p>
          </div>
          <div className="flex gap-2">
            <PrintPdfButton label={isArabic ? "طباعة PDF" : "Print PDF"} onPrint={handlePrintPDF} />
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition">
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <Can permission="holidays.create">
              <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                <Plus size={18} /> {isArabic ? "إضافة إجازة" : "Add Holiday"}
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
              <select value={recurringFilter} onChange={(e) => setRecurringFilter(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none focus:outline-none focus:border-gold">
                {recurringOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-3">
        <p className="text-sm text-text-secondary">
          {isArabic ? `عرض ${filteredHolidays.length} من ${holidays.length} إجازة` : `Showing ${filteredHolidays.length} of ${holidays.length} holidays`}
        </p>
      </div>

      <div className="p-6 pt-0">
        {loading ? (
          <DataLoader />
        ) : filteredHolidays.length === 0 ? (
          <Card className="p-12 text-center">
            <CalendarDays size={64} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">{isArabic ? "لا يوجد إجازات مطابقة للبحث" : "No matching holidays found"}</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHolidays.map((holiday) => (
              <Card key={holiday.id} hover className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <CalendarDays className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-primary">{holiday.name}</h3>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Can permission="holidays.update">
                      <button onClick={() => openEditModal(holiday)} className="p-1 text-text-muted hover:text-info"><Edit2 size={16} /></button>
                    </Can>
                    <Can permission="holidays.delete">
                      <button onClick={() => { setDeletingId(holiday.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger"><Trash2 size={16} /></button>
                    </Can>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-text-secondary">
                  <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-gold" /><span>{holiday.date}</span></div>
                  {holiday.description && (
                    <div className="flex items-start gap-2"><span className="text-gold w-4 h-4 flex-shrink-0 inline-flex items-center justify-center">📝</span><span>{holiday.description}</span></div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border-light flex justify-between items-center">
                  {holiday.isRecurring ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-info-light text-info-dark">
                      {isArabic ? "متكرر" : "Recurring"}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-surface-tertiary text-text-secondary">
                      {isArabic ? "غير متكرر" : "Non-recurring"}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {editingHoliday ? (isArabic ? "تعديل الإجازة" : "Edit Holiday") : (isArabic ? "إضافة إجازة جديدة" : "Add New Holiday")}
              </h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input type="text" name="name" placeholder={isArabic ? "اسم الإجازة" : "Holiday Name"} value={form.name} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <input type="date" name="date" value={form.date} onChange={handleInputChange} className="w-full p-3 border rounded-xl" required />
              <textarea name="description" placeholder={isArabic ? "الوصف" : "Description"} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full p-3 border rounded-xl" rows={3} />
              <label className="flex items-center gap-3 text-sm text-text-secondary">
                <input type="checkbox" name="isRecurring" checked={form.isRecurring} onChange={(e) => setForm((prev) => ({ ...prev, isRecurring: e.target.checked }))} className="w-5 h-5 accent-gold" />
                {isArabic ? "إجازة متكررة (سنوية)" : "Recurring (yearly)"}
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{editingHoliday ? (isArabic ? "تحديث" : "Update") : (isArabic ? "حفظ" : "Save")}</button>
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
              <p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذه الإجازة؟" : "Are you sure you want to delete this holiday?"}</p>
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