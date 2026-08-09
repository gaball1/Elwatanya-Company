import { apiClient } from '@/lib/api/apiClient';

export interface Subcontractor {
  id: string;
  name: string;
  workType: string;
  marginType: string;
  marginValue: number;
  phone: string;
  email: string;
  address: string;
  joinDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubcontractorData {
  name: string;
  workType?: string;
  marginType?: string;
  marginValue?: number;
  phone?: string;
  email?: string;
  address?: string;
  joinDate?: string;
  status?: string;
}

export interface UpdateSubcontractorData {
  name?: string;
  workType?: string;
  marginType?: string;
  marginValue?: number;
  phone?: string;
  email?: string;
  address?: string;
  joinDate?: string;
  status?: string;
}

export const subcontractorService = {
  async list(): Promise<Subcontractor[]> {
    const data = await apiClient<{ items: Subcontractor[] }>(
      `/subcontractors`,
      { method: 'GET' }
    );
    return data.items;
  },
  async get(id: string): Promise<Subcontractor> {
    const data = await apiClient<{ subcontractor: Subcontractor }>(
      `/subcontractors/${id}`,
      { method: 'GET' }
    );
    return data.subcontractor;
  },
  async create(body: CreateSubcontractorData): Promise<Subcontractor> {
    const data = await apiClient<{ subcontractor: Subcontractor }>(
      `/subcontractors`,
      { method: 'POST', body }
    );
    return data.subcontractor;
  },
  async update(id: string, body: UpdateSubcontractorData): Promise<Subcontractor> {
    const data = await apiClient<{ subcontractor: Subcontractor }>(
      `/subcontractors/${id}`,
      { method: 'PATCH', body }
    );
    return data.subcontractor;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/subcontractors/${id}`, { method: 'DELETE' });
  },
};
