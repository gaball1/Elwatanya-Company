export interface ProjectBoardDocumentResult {
  id: string;
  boardId: string;
  fileId: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  description: string;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectBoardDocumentInput {
  boardId: string;
  fileName: string;
  fileId?: string | null;
  mimeType?: string;
  fileSize?: number;
  description?: string;
  uploadedBy?: string | null;
}

export interface UpdateProjectBoardDocumentInput {
  id: string;
  fileName?: string;
  fileId?: string | null;
  mimeType?: string;
  fileSize?: number;
  description?: string;
}