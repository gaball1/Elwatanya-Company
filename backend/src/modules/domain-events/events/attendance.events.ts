import { DomainEvent } from '../domain/event-bus.interface';

export class AttendanceCheckedInEvent implements DomainEvent {
  readonly eventName = 'AttendanceCheckedIn';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'attendance',
    readonly payload: { id: string; employeeId: string; employeeName?: string; checkInTime?: string | Date; projectId?: string; buildingId?: string; recipientIds?: string[] },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class AttendanceCheckedOutEvent implements DomainEvent {
  readonly eventName = 'AttendanceCheckedOut';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'attendance',
    readonly payload: { id: string; employeeId: string; employeeName?: string; checkInTime?: string | Date; checkOutTime?: string | Date; workedMinutes?: number; recipientIds?: string[] },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
