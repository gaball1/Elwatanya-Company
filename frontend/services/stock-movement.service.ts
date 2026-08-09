import { apiClient } from '@/lib/api/apiClient';

export interface StockMovement {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  date: string;
  reference: string;
  notes: string;
  createdBy: string;
  issuedTo: string;
  supplier: string;
  fromWarehouse: string;
  toWarehouse: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStockMovementData {
  itemId: string;
  type: string;
  quantity: number;
  date?: string;
  reference?: string;
  notes?: string;
  createdBy?: string;
  issuedTo?: string;
  supplier?: string;
  fromWarehouse?: string;
  toWarehouse?: string;
}

export interface UpdateStockMovementData {
  itemId?: string;
  type?: string;
  quantity?: number;
  date?: string;
  reference?: string;
  notes?: string;
  createdBy?: string;
  issuedTo?: string;
  supplier?: string;
  fromWarehouse?: string;
  toWarehouse?: string;
}

export const stockMovementService = {
  async list(): Promise<StockMovement[]> {
    const data = await apiClient<{ items: StockMovement[] }>('/stock-movements', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<StockMovement> {
    const data = await apiClient<{ movement: StockMovement }>(`/stock-movements/${id}`, { method: 'GET' });
    return data.movement;
  },
  async create(body: CreateStockMovementData): Promise<StockMovement> {
    const data = await apiClient<{ movement: StockMovement }>('/stock-movements', { method: 'POST', body });
    return data.movement;
  },
  async update(id: string, body: UpdateStockMovementData): Promise<StockMovement> {
    const data = await apiClient<{ movement: StockMovement }>(`/stock-movements/${id}`, { method: 'PATCH', body });
    return data.movement;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/stock-movements/${id}`, { method: 'DELETE' });
  },
};
