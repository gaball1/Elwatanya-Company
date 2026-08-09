import { apiClient } from '@/lib/api/apiClient';

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  description: string;
  categoryId: string;
  warehouseId: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  price: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemData {
  code: string;
  name: string;
  description?: string;
  categoryId?: string;
  warehouseId?: string;
  unit?: string;
  quantity?: number;
  minQuantity?: number;
  price?: number;
  status?: string;
}

export interface UpdateInventoryItemData {
  code?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  warehouseId?: string;
  unit?: string;
  quantity?: number;
  minQuantity?: number;
  price?: number;
  status?: string;
}

export const inventoryItemService = {
  async list(): Promise<InventoryItem[]> {
    const data = await apiClient<{ items: InventoryItem[] }>('/inventory-items', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<InventoryItem> {
    const data = await apiClient<{ item: InventoryItem }>(`/inventory-items/${id}`, { method: 'GET' });
    return data.item;
  },
  async create(body: CreateInventoryItemData): Promise<InventoryItem> {
    const data = await apiClient<{ item: InventoryItem }>('/inventory-items', { method: 'POST', body });
    return data.item;
  },
  async update(id: string, body: UpdateInventoryItemData): Promise<InventoryItem> {
    const data = await apiClient<{ item: InventoryItem }>(`/inventory-items/${id}`, { method: 'PATCH', body });
    return data.item;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/inventory-items/${id}`, { method: 'DELETE' });
  },
};
