import { apiClient } from '@/lib/api/apiClient';

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  content: string;
  variables: any[];
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  title: string;
  templateId?: string;
  template?: { id: string; name: string };
  documentNumber?: string;
  category: string;
  status: 'draft' | 'final' | 'archived';
  content?: string;
  variables: Record<string, any>;
  entityType?: string;
  entityId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  category?: string;
  content: string;
  variables?: any[];
}

export interface CreateDocumentData {
  title: string;
  templateId?: string;
  category?: string;
  variables?: Record<string, any>;
  entityType?: string;
  entityId?: string;
}

export const documentEngineService = {
  // ─── Templates ─────────────────────────────────────────────────
  async getTemplates(category?: string): Promise<DocumentTemplate[]> {
    const path = category ? `/document-engine/templates?category=${category}` : '/document-engine/templates';
    const data = await apiClient<{ templates: DocumentTemplate[] }>(path, { method: 'GET' });
    return data.templates;
  },

  async getTemplate(id: string): Promise<DocumentTemplate> {
    const data = await apiClient<{ template: DocumentTemplate }>(`/document-engine/templates/${id}`, { method: 'GET' });
    return data.template;
  },

  async createTemplate(body: CreateTemplateData): Promise<DocumentTemplate> {
    const data = await apiClient<{ template: DocumentTemplate }>('/document-engine/templates', { method: 'POST', body });
    return data.template;
  },

  async updateTemplate(id: string, body: Partial<CreateTemplateData>): Promise<DocumentTemplate> {
    const data = await apiClient<{ template: DocumentTemplate }>(`/document-engine/templates/${id}`, { method: 'PUT', body });
    return data.template;
  },

  async deleteTemplate(id: string): Promise<void> {
    await apiClient(`/document-engine/templates/${id}`, { method: 'DELETE' });
  },

  async renderTemplate(id: string, variables: Record<string, any>): Promise<{ rendered: string; missingVariables: string[] }> {
    return apiClient(`/document-engine/templates/${id}/render`, { method: 'POST', body: { variables } });
  },

  // ─── Documents ─────────────────────────────────────────────────
  async getDocuments(category?: string, entityType?: string, entityId?: string): Promise<Document[]> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (entityType) params.set('entityType', entityType);
    if (entityId) params.set('entityId', entityId);
    const qs = params.toString();
    const data = await apiClient<{ documents: Document[] }>(`/document-engine/documents${qs ? '?' + qs : ''}`, { method: 'GET' });
    return data.documents;
  },

  async getDocument(id: string): Promise<Document> {
    const data = await apiClient<{ document: Document }>(`/document-engine/documents/${id}`, { method: 'GET' });
    return data.document;
  },

  async createDocument(body: CreateDocumentData): Promise<Document> {
    const data = await apiClient<{ document: Document }>('/document-engine/documents', { method: 'POST', body });
    return data.document;
  },

  async generateFromTemplate(templateId: string, title: string, variables: Record<string, any>): Promise<{ document: Document; preview: string; missingVariables: string[] }> {
    return apiClient('/document-engine/documents/generate', { method: 'POST', body: { templateId, title, variables } });
  },

  async finalizeDocument(id: string): Promise<Document> {
    const data = await apiClient<{ document: Document }>(`/document-engine/documents/${id}/finalize`, { method: 'POST' });
    return data.document;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient(`/document-engine/documents/${id}`, { method: 'DELETE' });
  },
};
