import { DomainEvent } from '../domain/event-bus.interface';

export class PaymentCreatedEvent implements DomainEvent {
  readonly eventName = 'PaymentCreated';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'payment',
    readonly payload: { id: string; extractId?: string; contractorId: string; amount: number; projectId: string; createdBy?: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class PaymentApprovedEvent implements DomainEvent {
  readonly eventName = 'PaymentApproved';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'payment',
    readonly payload: { id: string; amount: number; approvedBy: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
