import { DomainEvent } from '../domain/event-bus.interface';

export class AttendanceOverrideRequestedEvent implements DomainEvent {
  readonly eventName = 'AttendanceOverrideRequested';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'attendance_override',
    readonly payload: Record<string, any>,
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class AttendanceOverrideApprovedEvent implements DomainEvent {
  readonly eventName = 'AttendanceOverrideApproved';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'attendance_override',
    readonly payload: Record<string, any>,
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class AttendanceOverrideRejectedEvent implements DomainEvent {
  readonly eventName = 'AttendanceOverrideRejected';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'attendance_override',
    readonly payload: Record<string, any>,
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
