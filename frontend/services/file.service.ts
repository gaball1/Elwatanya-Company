import { apiClient } from "@/lib/api/apiClient";
import { API_BASE_URL } from "@/lib/api/env";
import { attachAuthHeader } from "@/lib/api/authInterceptor";
import { safeFetch } from "@/lib/api/fetchTransport";

export interface FileItem {
  id: string;
  category: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  uploadedById?: string;
  createdAt: string;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export const fileService = {
  async listByEntity(entityType: string, entityId: string): Promise<FileItem[]> {
    const data = await apiClient<{ files: FileItem[] }>(
      `/files?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
      { method: "GET" }
    );
    return data.files;
  },

  async upload(
    file: File,
    category: string,
    entityType?: string,
    entityId?: string
  ): Promise<FileItem> {
    const base64 = await readAsBase64(file);
    return this.uploadBase64(base64, file.name, category, entityType, entityId);
  },

  async uploadBase64(
    base64: string,
    fileName: string,
    category: string,
    entityType?: string,
    entityId?: string
  ): Promise<FileItem> {
    const qs = [
      entityType ? `entityType=${encodeURIComponent(entityType)}` : "",
      entityId ? `entityId=${encodeURIComponent(entityId)}` : "",
    ]
      .filter(Boolean)
      .join("&");
    return apiClient<FileItem>(`/files/upload-base64${qs ? `?${qs}` : ""}`, {
      method: "POST",
      body: { base64, fileName, category },
    });
  },

  async downloadBlob(id: string): Promise<Blob> {
    const base = API_BASE_URL.replace(/\/$/, "");
    const response = await safeFetch(`${base}/files/download/${id}`, {
      method: "GET",
      headers: attachAuthHeader(),
    });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    return response.blob();
  },

  async remove(id: string): Promise<void> {
    await apiClient(`/files/${id}`, { method: "DELETE" });
  },
};
