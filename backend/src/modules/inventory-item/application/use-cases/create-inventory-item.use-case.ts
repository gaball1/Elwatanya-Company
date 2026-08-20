import { Result } from '@/shared/kernel/result';
import { IInventoryItemRepository } from '../../domain/inventory-item.repository';
import { CreateInventoryItemInput, InventoryItemResult } from '../dto/inventory-item.dto';
import { InventoryItem } from '../../domain/inventory-item.entity';
import { toResult } from './list-inventory-items.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { normalizeKey } from '@/shared/utils/string-normalizer';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class CreateInventoryItemUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(input: CreateInventoryItemInput, user: OwnershipActor | undefined, userId?: string): Promise<Result<InventoryItemResult>> {
    if (input.projectId) await this.ownership.verifyProjectAccess(user, input.projectId);
    const createdBy = userId ?? 'system';

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

      // Name must be globally unique (case/AR-insensitive, across all categories).
      if (input.name) {
        const conflict = await this.items.findNameConflict(normalizeKey(input.name));
        if (conflict) {
          return Result.fail(
            new Error(
              `An item named "${conflict.name}" already exists. Item names must be unique — to add stock, use Stock Movement / Receive instead of creating a duplicate item.`,
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
      projectId: input.projectId,
      unit: input.unit,
      quantity: input.quantity,
      minQuantity: input.minQuantity,
      price: input.price,
      status: input.status,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const item = result.getValue();
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.items.save(item);
        if (input.quantity && input.quantity > 0) {
          await tx.stockMovement.create({
            data: {
              itemId: item.id.toValue(),
              type: 'RECEIVE',
              quantity: input.quantity,
              date: new Date(),
              reason: input.reason?.trim() || 'افتتاح رصيد / إضافة صنف جديد',
              notes: input.reason?.trim() || 'إضافة صنف جديد',
            },
          });
        }
      });
    } catch (error: any) {
      if (error?.code === 'P2002' || /unique/i.test(error?.message ?? '')) {
        return Result.fail(
          new Error(
            `An inventory item with name "${input.name}" or code "${input.code}" already exists. Item names and codes must be unique.`,
          ),
        );
      }
      return Result.fail(error);
    }
    return Result.ok(toResult(item));
  }
}