import { Result } from '@/shared/kernel/result';
import { StockMovement } from '../../domain/stock-movement.entity';
import { StockMovementResult } from '../dto/stock-movement.dto';
import { OwnershipActor } from '@/common/services/ownership.service';

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

  async execute(actor?: OwnershipActor): Promise<Result<StockMovementResult[]>> {
    // SUPER_ADMIN sees everything; others only movements from assigned
    // projects (scoped at the SQL level via the item's project relation).
    let projectIds: string[] | undefined;
    if (actor && typeof actor === 'object') {
      if (!(Array.isArray(actor.roleNames) && actor.roleNames.includes('SUPER_ADMIN'))) {
        projectIds = actor.projectIds?.length ? actor.projectIds : actor.projectId ? [actor.projectId] : [];
      }
    }

    const list = await this.stockMovements.findAll(projectIds);
    return Result.ok(list.map(toResult));
  }
}
