import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IStockMovementRepository } from '../../domain/stock-movement.repository';
import { StockMovementType } from '../../domain/stock-movement.entity';
import { UpdateStockMovementInput, StockMovementResult } from '../dto/stock-movement.dto';
import { toResult } from './list-stock-movements.use-case';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { StockMovementUpdatedEvent } from '@/modules/domain-events/events';

export class UpdateStockMovementUseCase {
  constructor(
    private readonly stockMovements: IStockMovementRepository,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(input: UpdateStockMovementInput): Promise<Result<StockMovementResult>> {
    const stockMovement = await this.stockMovements.findById(new UniqueEntityId(input.id));
    if (!stockMovement) return Result.fail(new Error('Stock movement not found'));

    const updateResult = stockMovement.update({
      itemId: input.itemId,
      type: input.type as StockMovementType | undefined,
      quantity: input.quantity,
      date: input.date,
      reference: input.reference,
      notes: input.notes,
      createdBy: input.createdBy,
      issuedTo: input.issuedTo,
      supplier: input.supplier,
      fromWarehouse: input.fromWarehouse,
      toWarehouse: input.toWarehouse,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.stockMovements.save(stockMovement);

    await this.eventBus.publish(
      new StockMovementUpdatedEvent(
        stockMovement.id.toValue(),
        'stock_movement',
        {
          id: stockMovement.id.toValue(),
          itemId: stockMovement.itemId,
          type: stockMovement.type,
          quantity: stockMovement.quantity,
          updatedBy: input.createdBy,
        },
      ),
    );

    return Result.ok(toResult(stockMovement));
  }
}
