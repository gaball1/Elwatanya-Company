import { DomainEvent } from '../domain/event-bus.interface';

export class ApprovalRequestedEvent implements DomainEvent {
  readonly eventName = 'ApprovalRequested';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'approval',
    readonly payload: { id: string; entityType: string; entityId: string; title: string; requestedBy?: string; permission: string; projectId?: string; recipientIds?: string[] },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class ApprovalApprovedEvent implements DomainEvent {
  readonly eventName = 'ApprovalApproved';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'approval',
    readonly payload: { id: string; entityType: string; entityId: string; title: string; approvedBy: string; approvedFor?: string; recipientIds?: string[] },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class ApprovalRejectedEvent implements DomainEvent {
  readonly eventName = 'ApprovalRejected';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'approval',
    readonly payload: { id: string; entityType: string; entityId: string; title: string; rejectedBy: string; reason?: string; rejectedFor?: string; recipientIds?: string[] },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}

export class ApprovalCancelledEvent implements DomainEvent {
  readonly eventName = 'ApprovalCancelled';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly aggregateType = 'approval',
    readonly payload: { id: string; entityType: string; entityId: string; title: string; cancelledBy: string; reason?: string; recipientIds?: string[] },
    readonly correlationId?: string,
    readonly metadata?: Record<string, any>,
  ) {}
}
