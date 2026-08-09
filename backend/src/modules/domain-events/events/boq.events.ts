import { DomainEvent } from '../domain/event-bus.interface';

export class BOQUploadedEvent implements DomainEvent {
  readonly eventName = 'BOQUploaded';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'boq',
    readonly payload: { id: string; buildingId: string; boqType: string; itemCount: number; uploadedBy?: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class BOQUpdatedEvent implements DomainEvent {
  readonly eventName = 'BOQUpdated';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'boq',
    readonly payload: { id: string; projectId: string; businessCode: string; status: string; updatedBy?: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
