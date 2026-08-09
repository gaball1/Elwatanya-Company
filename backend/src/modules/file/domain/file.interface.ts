export interface FileDto {
  id: string;
  category: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  uploadedById?: string;
  createdAt: Date;
}

export interface UploadOptions {
  category: string;
  fileName: string;
  mimeType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}
