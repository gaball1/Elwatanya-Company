import { apiClient } from '@/lib/api/apiClient';

export interface ChangeOrder {
  id: string;
  projectId: string;
  changeNumber: number;
  title: string;
  description: string;
  reason: string;
  originalAmount: number;
  changeAmount: number;
  newAmount: number;
  status: string;
  requestedBy: string | null;
  approvedBy: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChangeOrderData {
  projectId: string;
  title: string;
  description?: string;
  reason?: string;
  changeAmount: number;
}

export const changeOrderService = {
  async list(projectId: string): Promise<ChangeOrder[]> {
    const data = await apiClient<{ items: ChangeOrder[] }>(`/change-orders?projectId=${projectId}`, { method: 'GET' });
    return data.items || [];
  },

  async getById(id: string): Promise<ChangeOrder> {
    const data = await apiClient<{ item: ChangeOrder }>(`/change-orders/${id}`, { method: 'GET' });
    return data.item;
  },

  async create(body: CreateChangeOrderData): Promise<ChangeOrder> {
    const data = await apiClient<{ item: ChangeOrder }>('/change-orders', { method: 'POST', body });
    return data.item;
  },

  async update(id: string, body: Partial<CreateChangeOrderData>): Promise<ChangeOrder> {
    const data = await apiClient<{ item: ChangeOrder }>(`/change-orders/${id}`, { method: 'PATCH', body });
    return data.item;
  },

  async approve(id: string): Promise<ChangeOrder> {
    const data = await apiClient<{ item: ChangeOrder }>(`/change-orders/${id}/approve`, { method: 'POST' });
    return data.item;
  },

  async reject(id: string, reason: string): Promise<ChangeOrder> {
    const data = await apiClient<{ item: ChangeOrder }>(`/change-orders/${id}/reject`, { method: 'POST', body: { reason } });
    return data.item;
  },

  async delete(id: string): Promise<void> {
    await apiClient(`/change-orders/${id}`, { method: 'DELETE' });
  },
};
