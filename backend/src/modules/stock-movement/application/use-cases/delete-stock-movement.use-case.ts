import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IStockMovementRepository } from '../../domain/stock-movement.repository';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { StockMovementDeletedEvent } from '@/modules/domain-events/events';
import { PrismaService } from '@/prisma/prisma.service';
import { StockEffectService } from '../stock-effect.service';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { verifyStockMovementAccess } from '../stock-movement-ownership.util';

export class DeleteStockMovementUseCase {
  constructor(
    private readonly stockMovements: IStockMovementRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusImpl,
    private readonly stockEffect: StockEffectService,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(id: string, user: OwnershipActor | undefined): Promise<Result<void>> {
    const stockMovement = await this.stockMovements.findById(new UniqueEntityId(id));
    if (!stockMovement) return Result.fail(new Error('Stock movement not found'));

    await verifyStockMovementAccess(
      this.prisma,
      this.ownership,
      user,
      [stockMovement.itemId],
      [stockMovement.fromWarehouse, stockMovement.toWarehouse],
    );

    try {
      // Reverse the quantity effect and soft-delete the movement atomically.
      await this.prisma.$transaction(async (tx) => {
        await this.stockEffect.reverse(tx, {
          type: stockMovement.type,
          itemId: stockMovement.itemId,
          quantity: stockMovement.quantity,
          fromWarehouse: stockMovement.fromWarehouse,
          toWarehouse: stockMovement.toWarehouse,
        });
        await tx.stockMovement.update({
          where: { id: stockMovement.id.toValue() },
          data: { deletedAt: new Date(), updatedAt: new Date() },
        });
      });
    } catch (error: any) {
      return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }

    await this.eventBus.publish(
      new StockMovementDeletedEvent(
        stockMovement.id.toValue(),
        'stock_movement',
        {
          id: stockMovement.id.toValue(),
          itemId: stockMovement.itemId,
        },
      ),
    );

    return Result.ok();
  }
}
