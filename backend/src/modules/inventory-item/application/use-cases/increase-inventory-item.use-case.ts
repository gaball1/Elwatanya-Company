import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { PrismaService } from '@/prisma/prisma.service';
import { IInventoryItemRepository } from '../../domain/inventory-item.repository';
import { toResult } from './list-inventory-items.use-case';
import { InventoryItemResult } from '../dto/inventory-item.dto';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export interface IncreaseInventoryItemInput {
  id: string;
  quantity: number;
  reason?: string;
  unitCost?: number;
  createdBy?: string;
}

/**
 * "توريد" — increase the on-hand quantity of an inventory item and record a
 * RECEIVE stock movement so the operation is traceable.
 */
export class IncreaseInventoryItemUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(input: IncreaseInventoryItemInput, user?: OwnershipActor): Promise<Result<InventoryItemResult>> {
    try {
      if (!input.quantity || input.quantity <= 0) {
        return Result.fail(new Error('Quantity must be a positive number'));
      }

      const item = await this.items.findById(new UniqueEntityId(input.id));
      if (!item) {
        return Result.fail(new Error('Inventory item not found'));
      }

      if (item.projectId) await this.ownership.verifyProjectAccess(user, item.projectId);

      const receiveResult = item.receiveStock(input.quantity, input.unitCost ?? item.avgCost);
      if (receiveResult.isFailure) return Result.fail(receiveResult.error as Error);

      await this.prisma.$transaction(async (tx) => {
        await this.items.save(item);
        await tx.stockMovement.create({
          data: {
            itemId: item.id.toValue(),
            type: 'RECEIVE',
            quantity: input.quantity,
            date: new Date(),
            reason: input.reason ?? 'زيادة كمية / توريد',
            notes: input.reason ?? 'توريد',
            createdBy: input.createdBy ?? '',
          },
        });
      });

      return Result.ok(toResult(item));
    } catch (error: any) {
      return Result.fail(error);
    }
  }
}
