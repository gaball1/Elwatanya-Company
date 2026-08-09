import { DomainEvent } from '../domain/event-bus.interface';

export class BuildingCreatedEvent implements DomainEvent {
  readonly eventName = 'BuildingCreated';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'building',
    readonly payload: { id: string; name: string; code: string; projectId: string; createdBy?: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
