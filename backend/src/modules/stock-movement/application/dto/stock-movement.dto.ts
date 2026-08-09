export interface StockMovementResult {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  date: Date;
  reference: string;
  notes: string;
  createdBy: string;
  issuedTo: string;
  supplier: string;
  fromWarehouse: string;
  toWarehouse: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStockMovementInput {
  itemId: string;
  type: string;
  quantity: number;
  date?: Date;
  reference?: string;
  notes?: string;
  createdBy?: string;
  issuedTo?: string;
  supplier?: string;
  fromWarehouse?: string;
  toWarehouse?: string;
}

export interface UpdateStockMovementInput {
  id: string;
  itemId?: string;
  type?: string;
  quantity?: number;
  date?: Date;
  reference?: string;
  notes?: string;
  createdBy?: string;
  issuedTo?: string;
  supplier?: string;
  fromWarehouse?: string;
  toWarehouse?: string;
}
