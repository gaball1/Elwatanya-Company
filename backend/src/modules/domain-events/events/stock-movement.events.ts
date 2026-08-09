import { DomainEvent } from '../domain/event-bus.interface';

export class StockMovementCreatedEvent implements DomainEvent {
  readonly eventName = 'StockMovementCreated';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'stock_movement',
    readonly payload: { id: string; itemId: string; type: string; quantity: number; projectId?: string; warehouseId?: string; createdBy?: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class StockMovementUpdatedEvent implements DomainEvent {
  readonly eventName = 'StockMovementUpdated';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'stock_movement',
    readonly payload: { id: string; itemId: string; type: string; quantity: number; updatedBy?: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class StockMovementDeletedEvent implements DomainEvent {
  readonly eventName = 'StockMovementDeleted';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'stock_movement',
    readonly payload: { id: string; itemId: string; deletedBy?: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
