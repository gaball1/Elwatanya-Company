import { apiClient } from "@/lib/api/apiClient";
import { fileService } from "@/services/file.service";

export interface ProjectBoardDocument {
  id: string;
  boardId: string;
  fileId: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  description: string;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoardDocumentData {
  boardId: string;
  fileName: string;
  fileId?: string;
  mimeType?: string;
  fileSize?: number;
  description?: string;
}

export interface UpdateBoardDocumentData {
  fileName?: string;
  fileId?: string;
  mimeType?: string;
  fileSize?: number;
  description?: string;
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export const projectBoardDocumentService = {
  async list(boardId?: string): Promise<ProjectBoardDocument[]> {
    const qs = boardId ? `?boardId=${encodeURIComponent(boardId)}` : "";
    const data = await apiClient<{ items: ProjectBoardDocument[] }>(`/project-board-documents${qs}`, { method: "GET" });
    return data.items;
  },

  async create(body: CreateBoardDocumentData): Promise<ProjectBoardDocument> {
    const data = await apiClient<{ document: ProjectBoardDocument }>("/project-board-documents", { method: "POST", body });
    return data.document;
  },

  async update(id: string, body: UpdateBoardDocumentData): Promise<ProjectBoardDocument> {
    const data = await apiClient<{ document: ProjectBoardDocument }>(`/project-board-documents/${id}`, { method: "PATCH", body });
    return data.document;
  },

  async remove(id: string): Promise<void> {
    await apiClient(`/project-board-documents/${id}`, { method: "DELETE" });
  },

  /** Uploads a real file (PDF/CAD/image/...) then attaches it to the board as a document. */
  async uploadFile(
    boardId: string,
    file: File,
    description?: string
  ): Promise<ProjectBoardDocument> {
    const uploaded = await fileService.upload(file, "drawing", "board", boardId);
    return this.create({
      boardId,
      fileName: uploaded.originalName || file.name,
      fileId: uploaded.id,
      mimeType: uploaded.mimeType,
      fileSize: uploaded.size || file.size,
      description,
    });
  },

  /** Downloads the underlying stored file. Falls back to the file record when present. */
  async download(fileId: string, fileName: string): Promise<void> {
    const blob = await fileService.downloadBlob(fileId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
