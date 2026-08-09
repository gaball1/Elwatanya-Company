import { DomainEvent } from '../domain/event-bus.interface';

export class FundTransactionCreatedEvent implements DomainEvent {
  readonly eventName = 'FundTransactionCreated';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'fund-transaction',
    readonly payload: { id: string; fundId: string; projectId: string; type: string; amount: number; description: string; status: string; createdBy?: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
