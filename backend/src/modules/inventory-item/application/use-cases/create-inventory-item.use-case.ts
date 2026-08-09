import { Result } from '@/shared/kernel/result';
import { IInventoryItemRepository } from '../../domain/inventory-item.repository';
import { CreateInventoryItemInput, InventoryItemResult } from '../dto/inventory-item.dto';
import { InventoryItem } from '../../domain/inventory-item.entity';
import { toResult } from './list-inventory-items.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { normalizeKey } from '@/shared/utils/string-normalizer';

export class CreateInventoryItemUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateInventoryItemInput): Promise<Result<InventoryItemResult>> {
    try {
      // Category must be valid (existing + active) whenever provided.
      if (input.categoryId) {
        const category = await this.prisma.category.findFirst({
          where: { id: input.categoryId, deletedAt: null },
        });
        if (!category) return Result.fail(new Error('Category does not exist'));
        if (category.status !== 'active') return Result.fail(new Error('Category is inactive'));
      }

      // Code is globally unique (also on soft-deleted items to prevent resurrection clashes).
      const codeClash = await this.items.findByCodeIncludingDeleted(input.code?.trim() ?? '');
      if (codeClash) {
        return Result.fail(
          new Error(
            `Item code "${input.code}" already exists for item "${codeClash.name}" (id: ${codeClash.id.toValue()}). Use a different code.`,
          ),
        );
      }

      // Name must be unique within the same category (case/AR-insensitive).
      if (input.name) {
        const conflict = await this.items.findNameConflict(
          normalizeKey(input.name),
          input.categoryId ?? '',
        );
        if (conflict) {
          return Result.fail(
            new Error(
              `An item named "${conflict.name}" already exists in this category (id: ${conflict.id.toValue()}). To add stock, use Stock Movement / Receive instead of creating a duplicate item.`,
            ),
          );
        }
      }
    } catch (error: any) {
      return Result.fail(error);
    }

    const result = InventoryItem.create({
      code: input.code,
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      warehouseId: input.warehouseId,
      unit: input.unit,
      quantity: input.quantity,
      minQuantity: input.minQuantity,
      price: input.price,
      status: input.status,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const item = result.getValue();
    await this.items.save(item);
    return Result.ok(toResult(item));
  }
}