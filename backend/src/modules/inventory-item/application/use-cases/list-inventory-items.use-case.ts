import { Result } from '@/shared/kernel/result';
import { InventoryItem } from '../../domain/inventory-item.entity';
import { InventoryItemResult } from '../dto/inventory-item.dto';

export function toResult(c: InventoryItem, categoryName = ''): InventoryItemResult {
  return {
    id: c.id.toValue(),
    code: c.code,
    name: c.name,
    description: c.description,
    categoryId: c.categoryId,
    categoryName,
    warehouseId: c.warehouseId,
    projectId: c.projectId,
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
  constructor(
    private readonly items: import('../../domain/inventory-item.repository').IInventoryItemRepository,
    private readonly prisma: import('@/prisma/prisma.service').PrismaService,
  ) {}

  async execute(categoryId?: string, warehouseId?: string, projectId?: string): Promise<Result<InventoryItemResult[]>> {
    const list = await this.items.findAll(projectId);
    // Attach human-readable category names so clients never render raw UUIDs.
    const categoryIds = [...new Set(list.map((i) => i.categoryId).filter(Boolean))];
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds }, deletedAt: null },
      select: { id: true, name: true },
    });
    const nameById = new Map(categories.map((c) => [c.id, c.name]));

    let filtered = list;
    if (categoryId) filtered = filtered.filter((i) => i.categoryId === categoryId);
    if (warehouseId) filtered = filtered.filter((i) => i.warehouseId === warehouseId);

    return Result.ok(filtered.map((item) => toResult(item, nameById.get(item.categoryId) ?? '')));
  }
}
