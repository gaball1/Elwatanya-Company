import { DomainEvent } from '../domain/event-bus.interface';

export class ProjectCreatedEvent implements DomainEvent {
  readonly eventName = 'ProjectCreated';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'project',
    readonly payload: { id: string; name: string; code: string; client: string; status: string; createdBy?: string; notifyAll?: boolean },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class ProjectCompletedEvent implements DomainEvent {
  readonly eventName = 'ProjectCompleted';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'project',
    readonly payload: { id: string; name: string; completedAt: Date },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class ProjectStatusChangedEvent implements DomainEvent {
  readonly eventName = 'ProjectStatusChanged';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'project',
    readonly payload: { id: string; from: string; to: string; changedBy?: string },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
