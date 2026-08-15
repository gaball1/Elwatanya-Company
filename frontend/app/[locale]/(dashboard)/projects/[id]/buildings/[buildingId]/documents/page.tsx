/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { FileText, Image as ImageIcon, Upload, Download, Trash2, Loader2 } from "lucide-react";
import { fileService, type FileItem } from "@/services/file.service";
import { Can } from "@/components/Can";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  const d = new Date(value);
  return d.toLocaleDateString("en-GB");
}

const isImage = (mimeType: string) => (mimeType || "").startsWith("image/");

export default function BuildingDocumentsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const buildingId = params.buildingId as string;

  const { showToast, ToastComponent } = useToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fileService
      .listByEntity("building", buildingId)
      .then((items) => setFiles(items))
      .catch((err) => console.error("[Documents] Failed to load:", err))
      .finally(() => setLoading(false));
  }, [buildingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await fileService.upload(file, "building-document", "building", buildingId);
      showToast(
        isArabic ? "تم رفع الملف بنجاح" : "File uploaded successfully",
        "success"
      );
      refresh();
    } catch (err: any) {
      showToast(err?.message ?? (isArabic ? "فشل رفع الملف" : "Upload failed"), "error");
    } finally {
      setUploading(false);
    }
  };

  const openPreview = async (file: FileItem) => {
    try {
      const blob = await fileService.downloadBlob(file.id);
      setPreview(file);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      showToast(err?.message ?? (isArabic ? "تعذر فتح الملف" : "Could not open file"), "error");
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreview(null);
    setPreviewUrl("");
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const blob = await fileService.downloadBlob(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      showToast(err?.message ?? (isArabic ? "تعذر تنزيل الملف" : "Could not download file"), "error");
    }
  };

  const handleDelete = async (file: FileItem) => {
    setDeletingId(file.id);
    try {
      await fileService.remove(file.id);
      showToast(isArabic ? "تم حذف الملف" : "File deleted", "success");
      if (preview?.id === file.id) closePreview();
      refresh();
    } catch (err: any) {
      showToast(err?.message ?? (isArabic ? "فشل حذف الملف" : "Delete failed"), "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary">
            {isArabic ? "مستندات ورسم المبنى" : "Documents & Drawings"}
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            {isArabic
              ? "الرسومات الهندسية، العقود، الفواتير، والمستندات الخاصة بالمبنى"
              : "Architectural drawings, contracts, invoices and building documents"}
          </p>
        </div>
        <Can permission="files.upload">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-md cursor-pointer hover:bg-gold/90 transition">
            <Upload size={16} />
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              isArabic ? "رفع مستند" : "Upload document"
            )}
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        </Can>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-text-secondary">
          {isArabic ? "جارٍ التحميل..." : "Loading..."}
        </Card>
      ) : files.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto text-text-muted mb-3">
            <FileText size={40} />
          </div>
          <p className="text-text-secondary">
            {isArabic
              ? "لا توجد مستندات مرفوعة لهذا المبنى بعد"
              : "No documents uploaded for this building yet"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <Card key={file.id} className="p-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => openPreview(file)}
                className="flex items-start gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-md bg-surface-tertiary flex items-center justify-center shrink-0">
                  {isImage(file.mimeType) ? (
                    <ImageIcon size={20} className="text-gold" />
                  ) : (
                    <FileText size={20} className="text-gold" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-primary truncate">{file.originalName}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {formatSize(file.size)} · {formatDate(file.createdAt)}
                  </p>
                </div>
              </button>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <Badge variant="info">{isImage(file.mimeType) ? (isArabic ? "صورة" : "Image") : (isArabic ? "مستند" : "Document")}</Badge>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    className="p-2 rounded-md hover:bg-surface-tertiary text-text-secondary hover:text-gold transition"
                    title={isArabic ? "تنزيل" : "Download"}
                  >
                    <Download size={16} />
                  </button>
                  <Can permission="files.delete">
                    <button
                      type="button"
                      onClick={() => handleDelete(file)}
                      disabled={deletingId === file.id}
                      className="p-2 rounded-md hover:bg-surface-tertiary text-text-secondary hover:text-red-500 transition"
                      title={isArabic ? "حذف" : "Delete"}
                    >
                      {deletingId === file.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </Can>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {preview && previewUrl && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={closePreview}>
          <div className="bg-surface rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-medium text-primary truncate">{preview.originalName}</p>
              <button
                type="button"
                onClick={closePreview}
                className="p-1 rounded-md hover:bg-surface-tertiary text-text-secondary transition"
              >
                <span className="text-lg leading-none">✕</span>
              </button>
            </div>
            <div className="overflow-auto p-4 flex-1">
              {isImage(preview.mimeType) ? (
                <img src={previewUrl} alt={preview.originalName} className="max-w-full h-auto mx-auto rounded" />
              ) : (
                <iframe src={previewUrl} title={preview.originalName} className="w-full h-[70vh] rounded border border-border" />
              )}
            </div>
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  );
}
