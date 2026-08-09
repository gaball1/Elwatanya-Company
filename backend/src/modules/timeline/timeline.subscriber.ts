import { Injectable, Logger } from '@nestjs/common';
import { EventBusImpl } from '../domain-events/event-bus.impl';
import { TimelineService } from './timeline.service';
import { DomainEvent } from '../domain-events/domain/event-bus.interface';
import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class TimelineSubscriber implements OnModuleInit {
  private readonly logger = new Logger(TimelineSubscriber.name);

  constructor(
    private readonly eventBus: EventBusImpl,
    private readonly timeline: TimelineService,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe('*', {
      handle: async (event: DomainEvent) => {
        await this.handleEvent(event);
      },
    });
    this.logger.log('Timeline subscriber listening to all domain events');
  }

  private async handleEvent(event: DomainEvent): Promise<void> {
    const category = this.mapCategory(event.eventName);
    await this.timeline.record(
      event.aggregateType,
      event.aggregateId,
      this.humanize(event.eventName),
      category,
      {
        description: this.buildDescription(event),
        metadata: event.payload,
        causedByEventId: event.correlationId,
        triggeredById: event.payload?.createdBy ?? event.payload?.approvedBy,
      },
    );
  }

  private mapCategory(eventName: string): string {
    if (/Created|Completed|Status/i.test(eventName)) return 'lifecycle';
    if (/Approved|Rejected|Requested|Cancelled/i.test(eventName)) return 'approval';
    if (/Payment|Fund|Transaction/i.test(eventName)) return 'finance';
    if (/Uploaded|Updated|Imported/i.test(eventName)) return 'document';
    if (/CheckIn|CheckOut|Attendance/i.test(eventName)) return 'attendance';
    return 'general';
  }

  private humanize(eventName: string): string {
    return eventName
      .replace(/([A-Z])/g, ' $1')
      .replace(/Event$/, '')
      .trim()
      .replace(/^./, (s) => s.toUpperCase());
  }

  private buildDescription(event: DomainEvent): string | undefined {
    const p = event.payload;
    if (event.eventName === 'ProjectCreated') return `Project "${p.name}" was created`;
    if (event.eventName === 'BuildingCreated') return `Building "${p.name}" was created`;
    if (event.eventName === 'EmployeeCreated') return `Employee "${p.name}" was added`;
    if (event.eventName === 'PurchaseCreated') return `Purchase created for ${p.amount}`;
    if (event.eventName === 'ApprovalRequested') return `Approval requested: ${p.entityType}`;
    if (event.eventName === 'ApprovalApproved') return `Approval granted: ${p.entityType}`;
    if (event.eventName === 'ApprovalRejected') return `Approval rejected: ${p.entityType}`;
    if (event.eventName === 'ApprovalCancelled') return `Approval cancelled: ${p.entityType}`;
    if (event.eventName === 'ExtractCreated') return `Extract created for ${p.amount}`;
    if (event.eventName === 'ExtractApproved') return `Extract approved (${p.netPayable})`;
    if (event.eventName === 'PaymentCreated') return `Payment of ${p.amount} created`;
    if (event.eventName === 'PaymentApproved') return `Payment of ${p.amount} approved`;
    if (event.eventName === 'AttendanceCheckedIn') return `Checked in at ${p.checkInTime ?? 'unknown'}`;
    if (event.eventName === 'AttendanceCheckedOut') return `Checked out after ${p.workedMinutes ?? 0} minutes`;
    if (event.eventName === 'AttendanceOverrideRequested') return `Override requested: ${p.reason ?? ''}`;
    if (event.eventName === 'AttendanceOverrideApproved') return `Attendance override approved`;
    if (event.eventName === 'AttendanceOverrideRejected') return `Attendance override rejected`;
    if (event.eventName === 'FundTransactionCreated') return `${p.type}: ${p.amount} - ${p.description}`;
    if (event.eventName === 'StockMovementCreated') return `${p.type} of ${p.quantity} for item ${p.itemId}`;
    if (event.eventName === 'StockMovementUpdated') return `Stock movement updated (${p.type}, ${p.quantity})`;
    if (event.eventName === 'StockMovementDeleted') return `Stock movement deleted`;
    if (event.eventName === 'BOQUploaded') return `BOQ uploaded (${p.boqType}, ${p.itemCount} items)`;
    if (event.eventName === 'BOQUpdated') return `BOQ updated (${p.businessCode})`;
    if (event.eventName === 'ProjectStatusChanged') return `Project status changed: ${p.from} -> ${p.to}`;
    if (event.eventName === 'ProjectCompleted') return `Project "${p.name}" was completed`;
    return undefined;
  }
}
