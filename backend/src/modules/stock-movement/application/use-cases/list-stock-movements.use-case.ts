import { Result } from '@/shared/kernel/result';
import { StockMovement } from '../../domain/stock-movement.entity';
import { StockMovementResult } from '../dto/stock-movement.dto';

export function toResult(c: StockMovement): StockMovementResult {
  return {
    id: c.id.toValue(),
    itemId: c.itemId,
    type: c.type,
    quantity: c.quantity,
    date: c.date,
    reference: c.reference,
    reason: c.reason,
    notes: c.notes,
    createdBy: c.createdBy,
    issuedTo: c.issuedTo,
    supplier: c.supplier,
    fromWarehouse: c.fromWarehouse,
    toWarehouse: c.toWarehouse,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export class ListStockMovementsUseCase {
  constructor(private readonly stockMovements: import('../../domain/stock-movement.repository').IStockMovementRepository) {}

  async execute(): Promise<Result<StockMovementResult[]>> {
    const list = await this.stockMovements.findAll();
    return Result.ok(list.map(toResult));
  }
}
