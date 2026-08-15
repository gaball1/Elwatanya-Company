import { apiClient } from '@/lib/api/apiClient';

export interface Purchase {
  id: string;
  projectId: string;
  buildingId: string | null;
  supplierId: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  date: string;
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  notes: string;
  invoiceFile: string | null;
  supplierName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseData {
  projectId: string;
  buildingId?: string;
  supplierId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  date: string;
  notes?: string;
  invoiceFile?: string;
  supplierName?: string;
  createdBy: string;
}

export interface UpdatePurchaseData {
  itemName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  date?: string;
  notes?: string;
  invoiceFile?: string;
  supplierName?: string;
  buildingId?: string;
  supplierId?: string;
  createdBy?: string;
}

export const purchaseService = {
  async list(projectId?: string): Promise<Purchase[]> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const data = await apiClient<{ items: Purchase[] }>(`/purchases${params}`, { method: 'GET' });
    return data.items;
  },

  async get(id: string): Promise<Purchase> {
    const data = await apiClient<{ purchase: Purchase }>(`/purchases/${id}`, { method: 'GET' });
    return data.purchase;
  },

  async create(body: CreatePurchaseData): Promise<Purchase> {
    const data = await apiClient<{ purchase: Purchase }>('/purchases', { method: 'POST', body });
    return data.purchase;
  },

  async update(id: string, body: UpdatePurchaseData): Promise<Purchase> {
    const data = await apiClient<{ purchase: Purchase }>(`/purchases/${id}`, { method: 'PATCH', body });
    return data.purchase;
  },

  async updateStatus(id: string, status: 'approved' | 'received' | 'cancelled', warehouseId?: string): Promise<Purchase> {
    const data = await apiClient<{ purchase: Purchase }>(`/purchases/${id}/status`, { method: 'PUT', body: { status, warehouseId } });
    return data.purchase;
  },

  async remove(id: string): Promise<void> {
    await apiClient(`/purchases/${id}`, { method: 'DELETE' });
  },
};
