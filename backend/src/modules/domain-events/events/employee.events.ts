import { DomainEvent } from '../domain/event-bus.interface';

export class EmployeeCreatedEvent implements DomainEvent {
  readonly eventName = 'EmployeeCreated';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'employee',
    readonly payload: { id: string; name: string; role: string; department: string; createdBy?: string; roles?: string[] },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
