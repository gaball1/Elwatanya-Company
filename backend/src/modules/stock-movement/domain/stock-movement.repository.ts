import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { StockMovement } from './stock-movement.entity';

export const STOCK_MOVEMENT_REPOSITORY = Symbol('STOCK_MOVEMENT_REPOSITORY');

export interface IStockMovementRepository {
  save(stockMovement: StockMovement): Promise<void>;
  findById(id: UniqueEntityId): Promise<StockMovement | null>;
  findAll(projectIds?: string[]): Promise<StockMovement[]>;
}
