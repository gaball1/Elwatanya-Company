import { apiClient } from '@/lib/api/apiClient';

export interface Miscellaneous {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  invoiceFile?: string;
}

export interface CreateMiscellaneousData {
  projectId: string;
  description: string;
  amount: number;
  category?: string;
  date?: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateMiscellaneousData {
  projectId?: string;
  description?: string;
  amount?: number;
  category?: string;
  date?: string;
  notes?: string;
  createdBy?: string;
}

export const miscellaneousService = {
  async list(): Promise<Miscellaneous[]> {
    const data = await apiClient<{ items: Miscellaneous[] }>('/miscellaneous', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Miscellaneous> {
    const data = await apiClient<{ miscellaneous: Miscellaneous }>(`/miscellaneous/${id}`, { method: 'GET' });
    return data.miscellaneous;
  },
  async create(body: CreateMiscellaneousData): Promise<Miscellaneous> {
    const data = await apiClient<{ miscellaneous: Miscellaneous }>('/miscellaneous', { method: 'POST', body });
    return data.miscellaneous;
  },
  async update(id: string, body: UpdateMiscellaneousData): Promise<Miscellaneous> {
    const data = await apiClient<{ miscellaneous: Miscellaneous }>(`/miscellaneous/${id}`, { method: 'PATCH', body });
    return data.miscellaneous;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/miscellaneous/${id}`, { method: 'DELETE' });
  },
};
