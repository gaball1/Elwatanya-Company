import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IStockMovementRepository } from '../../domain/stock-movement.repository';
import { StockMovementType } from '../../domain/stock-movement.entity';
import { UpdateStockMovementInput, StockMovementResult } from '../dto/stock-movement.dto';
import { toResult } from './list-stock-movements.use-case';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { StockMovementUpdatedEvent } from '@/modules/domain-events/events';
import { PrismaService } from '@/prisma/prisma.service';
import { StockEffectService } from '../stock-effect.service';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { verifyStockMovementAccess } from '../stock-movement-ownership.util';

export class UpdateStockMovementUseCase {
  constructor(
    private readonly stockMovements: IStockMovementRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusImpl,
    private readonly stockEffect: StockEffectService,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(input: UpdateStockMovementInput, user: OwnershipActor | undefined, userId?: string): Promise<Result<StockMovementResult>> {
    const stockMovement = await this.stockMovements.findById(new UniqueEntityId(input.id));
    if (!stockMovement) return Result.fail(new Error('Stock movement not found'));

    const createdBy = userId ?? 'system';
    const originalType = stockMovement.type;
    const originalItemId = stockMovement.itemId;
    const originalQuantity = stockMovement.quantity;
    const originalToWarehouse = stockMovement.toWarehouse;

    const updateResult = stockMovement.update({
      itemId: input.itemId,
      type: input.type as StockMovementType | undefined,
      quantity: input.quantity,
      date: input.date,
      reference: input.reference,
      reason: input.reason,
      notes: input.notes,
      createdBy,
      issuedTo: input.issuedTo,
      supplier: input.supplier,
      fromWarehouse: input.fromWarehouse,
      toWarehouse: input.toWarehouse,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await verifyStockMovementAccess(
      this.prisma,
      this.ownership,
      user,
      [stockMovement.itemId],
      [stockMovement.fromWarehouse, stockMovement.toWarehouse],
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        // Reverse the original movement effect, then re-apply the new one.
        await this.stockEffect.reverse(tx, {
          type: originalType,
          itemId: originalItemId,
          quantity: originalQuantity,
          toWarehouse: originalToWarehouse,
        });
        await this.stockEffect.applyCreate(tx, {
          type: stockMovement.type,
          itemId: stockMovement.itemId,
          quantity: stockMovement.quantity,
          fromWarehouse: stockMovement.fromWarehouse,
          toWarehouse: stockMovement.toWarehouse,
        });
        await tx.stockMovement.update({
          where: { id: stockMovement.id.toValue() },
          data: {
            itemId: stockMovement.itemId,
            type: stockMovement.type,
            quantity: stockMovement.quantity,
            date: stockMovement.date,
            reference: stockMovement.reference,
            reason: stockMovement.reason,
            notes: stockMovement.notes,
            createdBy: stockMovement.createdBy,
            issuedTo: stockMovement.issuedTo,
            supplier: stockMovement.supplier,
            fromWarehouse: stockMovement.fromWarehouse,
            toWarehouse: stockMovement.toWarehouse,
            updatedAt: new Date(),
          },
        });
      });
    } catch (error: any) {
      return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }

    await this.eventBus.publish(
      new StockMovementUpdatedEvent(
        stockMovement.id.toValue(),
        'stock_movement',
        {
          id: stockMovement.id.toValue(),
          itemId: stockMovement.itemId,
          type: stockMovement.type,
          quantity: stockMovement.quantity,
          updatedBy: createdBy,
        },
      ),
    );

    return Result.ok(toResult(stockMovement));
  }
}
