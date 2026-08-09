import { apiClient } from '@/lib/api/apiClient';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseData {
  code: string;
  name: string;
  location?: string;
  status?: string;
}

export interface UpdateWarehouseData {
  code?: string;
  name?: string;
  location?: string;
  status?: string;
}

export const warehouseService = {
  async list(): Promise<Warehouse[]> {
    const data = await apiClient<{ items: Warehouse[] }>('/warehouses', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Warehouse> {
    const data = await apiClient<{ warehouse: Warehouse }>(`/warehouses/${id}`, { method: 'GET' });
    return data.warehouse;
  },
  async create(body: CreateWarehouseData): Promise<Warehouse> {
    const data = await apiClient<{ warehouse: Warehouse }>('/warehouses', { method: 'POST', body });
    return data.warehouse;
  },
  async update(id: string, body: UpdateWarehouseData): Promise<Warehouse> {
    const data = await apiClient<{ warehouse: Warehouse }>(`/warehouses/${id}`, { method: 'PATCH', body });
    return data.warehouse;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/warehouses/${id}`, { method: 'DELETE' });
  },
};
