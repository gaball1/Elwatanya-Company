import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IStockMovementRepository } from '../../domain/stock-movement.repository';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { StockMovementDeletedEvent } from '@/modules/domain-events/events';

export class DeleteStockMovementUseCase {
  constructor(
    private readonly stockMovements: IStockMovementRepository,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(id: string): Promise<Result<void>> {
    const stockMovement = await this.stockMovements.findById(new UniqueEntityId(id));
    if (!stockMovement) return Result.fail(new Error('Stock movement not found'));

    const deleteResult = stockMovement.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.stockMovements.save(stockMovement);

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
