import { DomainEvent } from '../domain/event-bus.interface';

export class PurchaseCreatedEvent implements DomainEvent {
  readonly eventName = 'PurchaseCreated';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'purchase',
    readonly payload: { id: string; projectId: string; supplierName: string; amount: number; status: string; createdBy?: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
