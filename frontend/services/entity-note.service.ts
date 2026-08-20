import { apiClient } from '@/lib/api/apiClient';

export interface EntityNote {
  id: string;
  entityType: string;
  entityId: string;
  userId: string;
  content: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  entityType: string;
  entityId: string;
  content: string;
}

export const entityNoteService = {
  async list(entityType: string, entityId: string): Promise<EntityNote[]> {
    const data = await apiClient<{ items: EntityNote[] }>(`/entity-notes?entityType=${entityType}&entityId=${entityId}`, { method: 'GET' });
    return data.items || [];
  },

  async create(body: CreateNoteData): Promise<EntityNote> {
    const data = await apiClient<{ item: EntityNote }>('/entity-notes', { method: 'POST', body });
    return data.item;
  },

  async update(id: string, content: string): Promise<EntityNote> {
    const data = await apiClient<{ item: EntityNote }>(`/entity-notes/${id}`, { method: 'PATCH', body: { content } });
    return data.item;
  },

  async delete(id: string): Promise<void> {
    await apiClient(`/entity-notes/${id}`, { method: 'DELETE' });
  },
};
