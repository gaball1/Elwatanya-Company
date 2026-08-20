/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import DataLoader from "@/components/shared/DataLoader";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import {
  ClipboardList,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  ArrowUpDown,
  Download,
  Image as ImageIcon,
  Calendar,
  User,
  Building2,
} from "lucide-react";
import { projectBoardService, type ProjectBoard } from "@/services/project-board.service";
import { useToast } from "@/components/ui/Toast";
import { printAsPDF } from "@/lib/printUtils";
import { Can } from "@/components/Can";

export default function ProjectBoardsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [boards, setBoards] = useState<ProjectBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingBoard, setEditingBoard] = useState<ProjectBoard | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [form, setForm] = useState({ buildingId: "", name: "", description: "", image: "", date: new Date().toISOString().split("T")[0], createdBy: "" });

  const fetchBoards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectBoardService.list();
      setBoards(data);
    } catch {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  const filteredAndSortedBoards = useMemo(() => {
    let filtered = [...boards];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((b) => b.name.toLowerCase().includes(term) || b.description.toLowerCase().includes(term));
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") comparison = a.name.localeCompare(b.name);
      else comparison = (a.date || "").localeCompare(b.date || "");
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [boards, searchTerm, sortBy, sortOrder]);

  const openAddModal = useCallback(() => {
    setEditingBoard(null);
    setForm({ buildingId: "", name: "", description: "", image: "", date: new Date().toISOString().split("T")[0], createdBy: "" });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((board: ProjectBoard) => {
    setEditingBoard(board);
    setForm({
      buildingId: board.buildingId,
      name: board.name,
      description: board.description || "",
      image: board.image || "",
      date: board.date ? board.date.split("T")[0] : new Date().toISOString().split("T")[0],
      createdBy: board.createdBy || "",
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBoard) {
        await projectBoardService.update(editingBoard.id, form);
        showToast(isArabic ? "تم تحديث اللوحة" : "Board updated", "success");
      } else {
        await projectBoardService.create(form);
        showToast(isArabic ? "تم إضافة اللوحة" : "Board added", "success");
      }
      await fetchBoards();
      setShowModal(false);
      setEditingBoard(null);
    } catch (error: any) {
      showToast(error?.message || (isArabic ? "حدث خطأ" : "Error"), "error");
    }
  }, [form, editingBoard, isArabic, fetchBoards]);

  const handleDelete = useCallback(async () => {
    if (deletingId) {
      try {
        await projectBoardService.remove(deletingId);
        await fetchBoards();
        showToast(isArabic ? "تم حذف اللوحة" : "Board deleted", "success");
      } catch { }
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  }, [deletingId, isArabic, fetchBoards]);

  const handlePrintPDF = useCallback((logoUrl?: string) => {
    const headers = [isArabic ? "الاسم" : "Name", isArabic ? "الوصف" : "Description", isArabic ? "التاريخ" : "Date", isArabic ? "بواسطة" : "Created By"];
    const rows = filteredAndSortedBoards.map((b) => [b.name, b.description || "—", b.date, b.createdBy]);
    printAsPDF(rows, headers, isArabic ? "تقرير لوحات المشروع" : "Project Boards Report", isArabic, { logoUrl });
  }, [filteredAndSortedBoards, isArabic]);

  const exportToExcel = useCallback(() => {
    const headers = ["الاسم", "الوصف", "التاريخ", "بواسطة"];
    const rows = filteredAndSortedBoards.map((b) => [b.name, b.description || "", b.date, b.createdBy]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `project_boards_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredAndSortedBoards, isArabic]);

  const toggleSort = useCallback((field: "name" | "date") => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("asc"); }
  }, [sortBy, sortOrder]);

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">{isArabic ? "لوحات المشروع" : "Project Boards"}</h1>
            <p className="text-sm text-text-secondary mt-1">{isArabic ? "إدارة لوحات وملصقات المشروع" : "Manage project boards and posters"}</p>
          </div>
          <div className="flex gap-2">
            <PrintPdfButton label={isArabic ? "طباعة PDF" : "Print PDF"} onPrint={handlePrintPDF} />
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition"><Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}</button>
            <Can permission="project-boards.create">
              <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"><Plus size={18} /> {isArabic ? "إضافة لوحة" : "Add Board"}</button>
            </Can>
          </div>
        </div>
      </div>

      <div className="bg-surface border-b px-6 py-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
            <input type="text" placeholder={isArabic ? "بحث..." : "Search..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg w-64 focus:outline-none focus:border-gold" />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-text-secondary">{isArabic ? "ترتيب حسب:" : "Sort by:"}</span>
            <button onClick={() => toggleSort("name")} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${sortBy === "name" ? "bg-gold text-white" : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"}`}>{isArabic ? "الاسم" : "Name"} <ArrowUpDown size={14} /></button>
            <button onClick={() => toggleSort("date")} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${sortBy === "date" ? "bg-gold text-white" : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"}`}>{isArabic ? "التاريخ" : "Date"} <ArrowUpDown size={14} /></button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3">
        <p className="text-sm text-text-secondary">{isArabic ? `عرض ${filteredAndSortedBoards.length} من ${boards.length} لوحة` : `Showing ${filteredAndSortedBoards.length} of ${boards.length} boards`}</p>
      </div>

      <div className="p-6 pt-0">
        {loading ? (
          <DataLoader />
        ) : filteredAndSortedBoards.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardList size={64} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">{isArabic ? "لا توجد لوحات مطابقة" : "No matching boards found"}</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedBoards.map((board) => (
              <Card key={board.id} hover className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-primary">{board.name}</h3>
                      <p className="text-sm text-gold">{isArabic ? "لوحة مشروع" : "Project Board"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Can permission="project-boards.update">
                      <button onClick={() => openEditModal(board)} className="p-1 text-text-muted hover:text-info"><Edit2 size={16} /></button>
                    </Can>
                    <Can permission="project-boards.delete">
                      <button onClick={() => { setDeletingId(board.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger"><Trash2 size={16} /></button>
                    </Can>
                  </div>
                </div>
                {board.image && (
                  <div className="mt-3 rounded-xl overflow-hidden h-32 bg-surface-tertiary flex items-center justify-center">
                    <img src={board.image} alt={board.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
                {!board.image && (
                  <div className="mt-3 rounded-xl h-32 bg-surface-tertiary flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-text-muted" />
                  </div>
                )}
                <div className="mt-3 space-y-2 text-sm text-text-secondary">
                  <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gold" /><span>{isArabic ? "مبنى" : "Building"}: {board.buildingId}</span></div>
                  {board.description && <p className="text-text-secondary">{board.description}</p>}
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" /><span>{board.date}</span></div>
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-gold" /><span>{board.createdBy || "—"}</span></div>
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
              <h2 className="text-xl font-bold text-primary">{editingBoard ? (isArabic ? "تعديل اللوحة" : "Edit Board") : (isArabic ? "إضافة لوحة جديدة" : "Add New Board")}</h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input type="text" name="buildingId" placeholder={isArabic ? "رقم المبنى" : "Building ID"} value={form.buildingId} onChange={(e) => setForm({ ...form, buildingId: e.target.value })} className="w-full p-3 border rounded-xl" required />
              <input type="text" name="name" placeholder={isArabic ? "اسم اللوحة" : "Board Name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full p-3 border rounded-xl" required />
              <textarea name="description" placeholder={isArabic ? "الوصف" : "Description"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-3 border rounded-xl" />
              <input type="text" name="image" placeholder={isArabic ? "رابط الصورة" : "Image URL"} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full p-3 border rounded-xl" />
              <input type="date" name="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full p-3 border rounded-xl" />
              <input type="text" name="createdBy" placeholder={isArabic ? "بواسطة" : "Created By"} value={form.createdBy} onChange={(e) => setForm({ ...form, createdBy: e.target.value })} className="w-full p-3 border rounded-xl" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{editingBoard ? (isArabic ? "تحديث" : "Update") : (isArabic ? "حفظ" : "Save")}</button>
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
              <p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذه اللوحة؟" : "Are you sure you want to delete this board?"}</p>
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
