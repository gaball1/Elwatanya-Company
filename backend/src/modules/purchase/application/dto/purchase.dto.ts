import { PurchaseStatus } from '../../domain/purchase.entity';

export interface PurchaseResult {
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
  status: PurchaseStatus;
  notes: string;
  invoiceFile: string | null;
  supplierName: string;
  createdBy: string;
  categoryId: string;
  inventoryItemId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseInput {
  projectId: string;
  buildingId?: string | null;
  supplierId?: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  date: Date;
  notes?: string;
  invoiceFile?: string | null;
  supplierName?: string;
  createdBy: string;
  categoryId?: string;
  inventoryItemId?: string;
}

export interface UpdatePurchaseInput {
  id: string;
  itemName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  date?: Date;
  notes?: string;
  invoiceFile?: string | null;
  supplierName?: string;
  buildingId?: string | null;
  supplierId?: string | null;
  createdBy?: string;
  categoryId?: string;
  inventoryItemId?: string;
}

export function toResult(purchase: {
  id: import('@/shared/kernel/unique-entity-id.vo').UniqueEntityId;
  projectId: string;
  buildingId: string | null;
  supplierId: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  date: Date;
  status: PurchaseStatus;
  notes: string;
  invoiceFile: string | null;
  supplierName: string;
  createdBy: string;
  categoryId: string;
  inventoryItemId: string;
  createdAt: Date;
  updatedAt: Date;
}): PurchaseResult {
  return {
    id: purchase.id.toValue(),
    projectId: purchase.projectId,
    buildingId: purchase.buildingId,
    supplierId: purchase.supplierId,
    itemName: purchase.itemName,
    quantity: purchase.quantity,
    unit: purchase.unit,
    unitPrice: purchase.unitPrice,
    total: purchase.total,
    date: purchase.date.toISOString(),
    status: purchase.status,
    notes: purchase.notes,
    invoiceFile: purchase.invoiceFile,
    supplierName: purchase.supplierName,
    createdBy: purchase.createdBy,
    categoryId: purchase.categoryId,
    inventoryItemId: purchase.inventoryItemId,
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
  };
}
