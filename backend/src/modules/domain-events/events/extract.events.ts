import { DomainEvent } from '../domain/event-bus.interface';

export class ExtractCreatedEvent implements DomainEvent {
  readonly eventName = 'ExtractCreated';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'extract',
    readonly payload: { id: string; buildingId: string; contractorId: string; projectId: string; amount: number; status: string; createdBy?: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class ExtractApprovedEvent implements DomainEvent {
  readonly eventName = 'ExtractApproved';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'extract',
    readonly payload: { id: string; approvedBy: string; amount: number; netPayable: number },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
