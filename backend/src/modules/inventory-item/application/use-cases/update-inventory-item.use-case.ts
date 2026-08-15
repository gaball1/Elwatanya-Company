import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IInventoryItemRepository } from '../../domain/inventory-item.repository';
import { UpdateInventoryItemInput, InventoryItemResult } from '../dto/inventory-item.dto';
import { toResult } from './list-inventory-items.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { normalizeKey } from '@/shared/utils/string-normalizer';

export class UpdateInventoryItemUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateInventoryItemInput): Promise<Result<InventoryItemResult>> {
    const item = await this.items.findById(new UniqueEntityId(input.id));
    if (!item) return Result.fail(new Error('Inventory item not found'));

    try {
      // Category must be valid (existing + active) whenever provided.
      if (input.categoryId) {
        const category = await this.prisma.category.findFirst({
          where: { id: input.categoryId, deletedAt: null },
        });
        if (!category) return Result.fail(new Error('Category does not exist'));
        if (category.status !== 'active') return Result.fail(new Error('Category is inactive'));
      }

      // Code must remain globally unique.
      if (input.code && input.code.trim() !== item.code) {
        const codeClash = await this.items.findByCodeIncludingDeleted(input.code.trim());
        if (codeClash && codeClash.id.toValue() !== item.id.toValue()) {
          return Result.fail(
            new Error(
              `Item code "${input.code}" already exists for item "${codeClash.name}" (id: ${codeClash.id.toValue()}). Use a different code.`,
            ),
          );
        }
      }

      // Name must be globally unique (case/AR-insensitive), excluding self.
      if (input.name) {
        const conflict = await this.items.findNameConflict(
          normalizeKey(input.name),
          item.id.toValue(),
        );
        if (conflict) {
          return Result.fail(
            new Error(
              `An item named "${conflict.name}" already exists. Use a different name — item names must be unique.`,
            ),
          );
        }
      }
    } catch (error: any) {
      return Result.fail(error);
    }

    const updateResult = item.update({
      code: input.code,
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      warehouseId: input.warehouseId,
      projectId: input.projectId,
      unit: input.unit,
      quantity: input.quantity,
      minQuantity: input.minQuantity,
      price: input.price,
      status: input.status,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.items.save(item);
    return Result.ok(toResult(item));
  }
}