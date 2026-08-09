import { Result } from '@/shared/kernel/result';
import { InventoryItem } from '../../domain/inventory-item.entity';
import { InventoryItemResult } from '../dto/inventory-item.dto';

export function toResult(c: InventoryItem): InventoryItemResult {
  return {
    id: c.id.toValue(),
    code: c.code,
    name: c.name,
    description: c.description,
    categoryId: c.categoryId,
    warehouseId: c.warehouseId,
    unit: c.unit,
    quantity: c.quantity,
    minQuantity: c.minQuantity,
    price: c.price,
    avgCost: c.avgCost,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export class ListInventoryItemsUseCase {
  constructor(private readonly items: import('../../domain/inventory-item.repository').IInventoryItemRepository) {}

  async execute(): Promise<Result<InventoryItemResult[]>> {
    const list = await this.items.findAll();
    return Result.ok(list.map(toResult));
  }
}
