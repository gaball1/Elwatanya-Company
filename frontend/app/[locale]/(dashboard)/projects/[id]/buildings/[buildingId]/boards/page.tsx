/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import { Image as ImageIcon, Plus, Edit2, Trash2, X, FileText, Download, Upload, File, FolderOpen } from "lucide-react";
import { projectBoardService, type ProjectBoard } from "@/services/project-board.service";
import { projectBoardDocumentService, type ProjectBoardDocument, formatFileSize } from "@/services/project-board-document.service";
import { Can } from "@/components/Can";
import { useToast } from "@/components/ui/Toast";

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto text-text-muted mb-3">{icon}</div>
      <p className="text-text-secondary">{message}</p>
    </Card>
  );
}

export default function BuildingBoardsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const buildingId = params.buildingId as string;
  const { showToast, ToastComponent } = useToast();

  const [boards, setBoards] = useState<ProjectBoard[]>([]);
  const [documents, setDocuments] = useState<Record<string, ProjectBoardDocument[]>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<ProjectBoard | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [boardImagePreview, setBoardImagePreview] = useState<string>("");
  const [boardForm, setBoardForm] = useState({
    name: "",
    description: "",
    image: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Document upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadBoardId, setUploadBoardId] = useState<string | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const refreshDocuments = async (boardIds: string[]) => {
    try {
      const entries = await Promise.all(
        boardIds.map(async (id) => [id, await projectBoardDocumentService.list(id)] as const)
      );
      setDocuments(Object.fromEntries(entries));
    } catch {
      // ignore
    }
  };

  const loadAll = () => {
    projectBoardService.list()
      .then((data) => {
        const filtered = data.filter((b) => b.buildingId === buildingId);
        setBoards(filtered);
        void refreshDocuments(filtered.map((b) => b.id));
      })
      .catch((err) => console.error("[Boards] Failed to load:", err));
  };

  useEffect(() => {
    loadAll();
  }, [buildingId]);

  const openAddModal = () => {
    setEditingBoard(null);
    setBoardForm({ name: "", description: "", image: "", date: new Date().toISOString().split("T")[0] });
    setBoardImagePreview("");
    setShowModal(true);
  };

  const openEditModal = (board: ProjectBoard) => {
    setEditingBoard(board);
    setBoardForm({
      name: board.name,
      description: board.description,
      image: board.image || "",
      date: board.date,
    });
    setBoardImagePreview(board.image || "");
    setShowModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        setBoardImagePreview(b64);
        setBoardForm((prev) => ({ ...prev, image: b64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const imageToSave = boardForm.image || boardImagePreview;
    try {
      if (editingBoard) {
        await projectBoardService.update(editingBoard.id, {
          name: boardForm.name,
          description: boardForm.description,
          image: imageToSave,
          date: boardForm.date,
        });
      } else {
        await projectBoardService.create({
          buildingId,
          name: boardForm.name,
          description: boardForm.description,
          image: imageToSave,
          date: boardForm.date,
        });
      }
      loadAll();
    } catch {
      // ignore
    }
    setShowModal(false);
    setEditingBoard(null);
    setBoardImagePreview("");
  };

  const handleDelete = async () => {
    if (deletingBoardId) {
      try {
        await projectBoardService.remove(deletingBoardId);
        loadAll();
      } catch {
        // ignore
      }
      setShowDeleteConfirm(false);
      setDeletingBoardId(null);
    }
  };

  const openUploadModal = (boardId: string) => {
    setUploadBoardId(boardId);
    setUploadDescription("");
    setSelectedFile(null);
    setShowUploadModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadBoardId || !selectedFile) {
      showToast(isArabic ? "اختر ملفاً أولاً" : "Please choose a file", "error");
      return;
    }
    setUploading(true);
    try {
      await projectBoardDocumentService.uploadFile(uploadBoardId, selectedFile, uploadDescription.trim());
      showToast(isArabic ? "تم رفع المستند" : "Document uploaded", "success");
      void refreshDocuments(boards.map((b) => b.id));
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadDescription("");
    } catch (err: any) {
      showToast(err?.message || (isArabic ? "فشل رفع المستند" : "Upload failed"), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: ProjectBoardDocument) => {
    if (!doc.fileId) {
      showToast(isArabic ? "لا يوجد ملف مرتبط" : "No file linked", "error");
      return;
    }
    try {
      await projectBoardDocumentService.download(doc.fileId, doc.fileName);
    } catch {
      showToast(isArabic ? "فشل تحميل الملف" : "Download failed", "error");
    }
  };

  const handleDeleteDocument = async (doc: ProjectBoardDocument) => {
    try {
      await projectBoardDocumentService.remove(doc.id);
      showToast(isArabic ? "تم حذف المستند" : "Document deleted", "success");
      void refreshDocuments(boards.map((b) => b.id));
    } catch {
      showToast(isArabic ? "فشل حذف المستند" : "Delete failed", "error");
    }
  };

  return (
    <div>
      {ToastComponent}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-primary">
          {isArabic ? "لوحات ومستندات المشروع" : "Project Boards & Documents"}
        </h2>
        <Can permission="project-boards.create">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition"
          >
            <Plus size={16} />
            {isArabic ? "إضافة لوحة" : "Add Board"}
          </button>
        </Can>
      </div>

      {boards.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={48} />}
          message={isArabic ? "لا توجد لوحات مشروع" : "No project boards found"}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <Card key={board.id} hover className="p-4 overflow-hidden">
              <div className="relative h-40 w-full mb-3 rounded-lg overflow-hidden bg-surface-tertiary">
                {board.image ? (
                  <img src={board.image} alt={board.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={48} className="text-text-muted" />
                  </div>
                )}
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-primary">{board.name}</h3>
                  <p className="text-sm text-text-secondary mt-1 line-clamp-2">{board.description}</p>
                  <p className="text-xs text-text-muted mt-2">{isArabic ? "التاريخ" : "Date"}: {board.date}</p>
                </div>
                <div className="flex gap-1">
                  <Can permission="project-boards.update">
                    <button onClick={() => openEditModal(board)} className="p-1 text-text-muted hover:text-info transition">
                      <Edit2 size={14} />
                    </button>
                  </Can>
                  <Can permission="project-boards.delete">
                    <button onClick={() => { setDeletingBoardId(board.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger transition">
                      <Trash2 size={14} />
                    </button>
                  </Can>
                </div>
              </div>

              {/* Documents */}
              <div className="mt-4 border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-text-primary flex items-center gap-1">
                    <FolderOpen size={13} className="text-gold" />
                    {isArabic ? "المستندات والرسومات" : "Documents & Drawings"}
                  </p>
                  <Can permission="project-boards.create">
                    <button
                      onClick={() => openUploadModal(board.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gold text-white rounded-lg hover:bg-gold-dark transition"
                    >
                      <Upload size={12} />
                      {isArabic ? "رفع" : "Upload"}
                    </button>
                  </Can>
                </div>
                {!documents[board.id] || documents[board.id].length === 0 ? (
                  <p className="text-xs text-text-muted">{isArabic ? "لا توجد مستندات" : "No documents"}</p>
                ) : (
                  <ul className="space-y-1">
                    {documents[board.id].map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-2 text-xs bg-surface-secondary rounded-lg px-2 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={13} className="text-info shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate text-text-primary">{doc.fileName}</p>
                            <p className="text-[10px] text-text-muted">
                              {formatFileSize(doc.fileSize)}
                              {doc.description ? ` • ${doc.description}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {doc.fileId && (
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1 text-info hover:bg-info/10 rounded transition"
                              title={isArabic ? "تحميل" : "Download"}
                            >
                              <Download size={13} />
                            </button>
                          )}
                          <Can permission="project-boards.delete">
                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              className="p-1 text-text-muted hover:text-danger rounded transition"
                              title={isArabic ? "حذف" : "Delete"}
                            >
                              <Trash2 size={13} />
                            </button>
                          </Can>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Board Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {editingBoard ? (isArabic ? "تعديل لوحة" : "Edit Board") : (isArabic ? "إضافة لوحة جديدة" : "Add New Board")}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-secondary">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input
                type="text"
                placeholder={isArabic ? "اسم اللوحة" : "Board Name"}
                value={boardForm.name}
                onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
                className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold"
                required
              />
              <textarea
                placeholder={isArabic ? "وصف اللوحة" : "Board Description"}
                value={boardForm.description}
                onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })}
                rows={3}
                className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold resize-none"
              />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "رفع الصورة" : "Upload Image"}
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-surface-tertiary hover:bg-surface-tertiary text-text-primary px-4 py-2 rounded-lg transition">
                    {isArabic ? "اختر ملف" : "Choose File"}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {boardImagePreview && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
                      <img src={boardImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <input
                type="date"
                value={boardForm.date}
                onChange={(e) => setBoardForm({ ...boardForm, date: e.target.value })}
                className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold"
              />
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary">
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark">
                  {isArabic ? "حفظ" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "رفع مستند / رسمة" : "Upload Document / Drawing"}
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="text-text-muted hover:text-text-secondary">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "الملف (PDF / صور / CAD / ملفات هندسية)" : "File (PDF / images / CAD / engineering files)"}
                </label>
                <label className="cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 hover:border-gold transition">
                  <File size={20} className="text-text-muted" />
                  <span className="text-sm text-text-primary">
                    {selectedFile ? selectedFile.name : (isArabic ? "اختر ملف" : "Choose file")}
                  </span>
                  <input type="file" onChange={handleFileSelect} className="hidden" />
                </label>
                {selectedFile && (
                  <p className="text-xs text-text-muted mt-1">{formatFileSize(selectedFile.size)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "وصف المستند" : "Document Description"}
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold resize-none"
                  placeholder={isArabic ? "مثال: لوحة صب الخرسانة - الدور الأرضي" : "e.g. Concrete pouring drawing - Ground floor"}
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary">
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" disabled={uploading} className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50">
                  {uploading ? (isArabic ? "جاري الرفع..." : "Uploading...") : (isArabic ? "رفع" : "Upload")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Board Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-xl font-bold text-primary">{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</h2>
            </div>
            <div className="p-5">
              <p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذه اللوحة؟ سيتم حذف مستنداتها أيضاً." : "Are you sure you want to delete this board? Its documents will be removed too."}</p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary">
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-danger text-white rounded-xl hover:bg-danger-dark">
                  {isArabic ? "حذف" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
