export interface InventoryItemResult {
  id: string;
  code: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  warehouseId: string;
  projectId: string | null;
  unit: string;
  quantity: number;
  minQuantity: number;
  price: number;
  avgCost: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInventoryItemInput {
  code: string;
  name: string;
  description?: string;
  categoryId?: string;
  warehouseId?: string;
  projectId?: string;
  unit?: string;
  quantity?: number;
  reason?: string;
  minQuantity?: number;
  price?: number;
  status?: string;
}

export interface UpdateInventoryItemInput {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  warehouseId?: string;
  projectId?: string;
  unit?: string;
  quantity?: number;
  minQuantity?: number;
  price?: number;
  status?: string;
}
