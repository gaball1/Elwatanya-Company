import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { EventBusImpl } from '../domain-events/event-bus.impl';
import { DomainEvent } from '../domain-events/domain/event-bus.interface';
import { NotificationProviderRegistry } from './infrastructure/providers/provider-registry.service';
import { TemplateRendererService } from './infrastructure/templates/template-renderer.service';
import { NotificationChannel } from './domain/notification-channel.enum';
import { NotificationMessage, NotificationTemplate } from './domain/notification-provider.interface';
import { NotificationService } from '@/common/services/notification.service';

@Injectable()
export class NotificationEngineService implements OnModuleInit {
  private readonly logger = new Logger(NotificationEngineService.name);

  constructor(
    private readonly eventBus: EventBusImpl,
    private readonly providerRegistry: NotificationProviderRegistry,
    private readonly templateRenderer: TemplateRendererService,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit(): void {
    this.registerTemplates();
    this.eventBus.subscribe('*', {
      handle: async (event: DomainEvent) => {
        await this.handleEvent(event);
      },
    });
    this.logger.log('Notification engine subscribed to all domain events');
  }

  async sendDirect(message: Omit<NotificationMessage, 'id'>): Promise<boolean> {
    const full: NotificationMessage = { id: uuid(), ...message };
    return this.deliver(full);
  }

  private async handleEvent(event: DomainEvent): Promise<void> {
    const channels = [NotificationChannel.IN_APP];
    const variables = { ...event.payload, eventName: event.eventName };
    const payload = event.payload ?? {};

    const recipientIds = await this.resolveRecipients(payload);
    if (recipientIds.length === 0) return;

    for (const channel of channels) {
      if (!this.providerRegistry.hasProvider(channel)) continue;

      const rendered = this.templateRenderer.render(event.eventName, channel, variables);
      if (!rendered) continue;

      for (const recipientId of recipientIds) {
        const message: NotificationMessage = {
          id: uuid(),
          channel,
          recipientId,
          recipientAddress: recipientId,
          ...rendered,
          data: {
            entityType: event.aggregateType,
            entityId: event.aggregateId,
            link: this.buildLink(event.aggregateType, event.aggregateId, payload),
            ...event.payload,
          },
          priority: 'normal',
        };

        await this.deliver(message);
      }
    }
  }

  private buildLink(aggregateType: string, aggregateId: string, payload: any): string {
    const projectId = payload?.projectId;
    const buildingId = payload?.buildingId;
    
    switch (aggregateType) {
      case 'attendance_override':
        return `/attendance/overrides`;
      case 'attendance':
        return `/attendance`;
      case 'fund_transaction':
        if (projectId) return `/projects/${projectId}/treasury`;
        return `/treasury`;
      case 'purchase':
        if (projectId) return `/projects/${projectId}/purchases?purchaseId=${aggregateId}`;
        return `/purchases`;
      case 'extract':
        if (projectId && buildingId) return `/projects/${projectId}/buildings/${buildingId}/extracts/${aggregateId}`;
        if (projectId) return `/projects/${projectId}/extracts`;
        return `/extracts/${aggregateId}`;
      case 'payment':
        if (projectId) return `/projects/${projectId}/payments`;
        return `/payments`;
      case 'approval':
        return `/approvals`;
      case 'project':
        return `/projects/${aggregateId}`;
      case 'building':
        if (projectId) return `/projects/${projectId}/buildings/${aggregateId}`;
        return `/buildings/${aggregateId}`;
      case 'stock_movement':
        if (projectId) return `/projects/${projectId}/inventory`;
        return `/inventory`;
      default:
        return `/${aggregateType}s/${aggregateId}`;
    }
  }

  private async resolveRecipients(payload: Record<string, any>): Promise<string[]> {
    const ids = new Set<string>();

    if (Array.isArray(payload.recipientIds)) {
      for (const id of payload.recipientIds) if (id) ids.add(id);
    }
    if (payload.projectId) {
      for (const id of await this.notificationService.resolveProjectMemberIds(payload.projectId)) ids.add(id);
    }
    if (Array.isArray(payload.roles) && payload.roles.length > 0) {
      for (const id of await this.notificationService.resolveRoleIds(payload.roles)) ids.add(id);
    }
    if (payload.permission) {
      for (const id of await this.notificationService.resolvePermissionHolderIds(payload.permission)) ids.add(id);
    }
    if (payload.notifyAll) {
      for (const id of await this.notificationService.resolveAllActiveIds()) ids.add(id);
    }

    if (ids.size === 0) {
      const single = payload.userId ?? payload.createdBy ?? payload.approvedBy;
      if (single) ids.add(single);
    }

    return Array.from(ids);
  }

  private async deliver(message: NotificationMessage): Promise<boolean> {
    try {
      const provider = this.providerRegistry.getProvider(message.channel);
      const result = await provider.send(message);
      if (result) {
        this.logger.log(`Notification sent via ${message.channel} to ${message.recipientId}`);
      }
      return result;
    } catch (err) {
      this.logger.error(`Notification delivery failed (${message.channel}): ${(err as Error).message}`);
      return false;
    }
  }

  private registerTemplates(): void {
    const templates: NotificationTemplate[] = [
      { id: 'project-created-inapp', eventName: 'ProjectCreated', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'مشروع جديد', subjectTemplateEn: 'New Project',
        bodyTemplate: 'تم إنشاء المشروع {{name}}', bodyTemplateEn: 'Project {{name}} has been created',
        variables: ['name'] },
      { id: 'building-created-inapp', eventName: 'BuildingCreated', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'عمارة جديدة', subjectTemplateEn: 'New Building',
        bodyTemplate: 'تم إنشاء العمارة {{name}}', bodyTemplateEn: 'Building {{name}} has been created',
        variables: ['name'] },
      { id: 'employee-created-inapp', eventName: 'EmployeeCreated', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'موظف جديد', subjectTemplateEn: 'New Employee',
        bodyTemplate: 'تم إضافة الموظف {{name}} - {{role}}', bodyTemplateEn: 'Employee {{name}} ({{role}}) has been added',
        variables: ['name', 'role'] },
      { id: 'purchase-created-inapp', eventName: 'PurchaseCreated', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'مشتريات جديدة', subjectTemplateEn: 'New Purchase',
        bodyTemplate: 'تم إنشاء أمر شراء بقيمة {{amount}}', bodyTemplateEn: 'Purchase order created for {{amount}}',
        variables: ['amount'] },
      { id: 'approval-requested-inapp', eventName: 'ApprovalRequested', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'طلب اعتماد', subjectTemplateEn: 'Approval Request',
        bodyTemplate: '{{title}} بانتظار اعتمادك', bodyTemplateEn: '{{title}} awaits your approval',
        variables: ['title'] },
      { id: 'approval-approved-inapp', eventName: 'ApprovalApproved', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تم الاعتماد', subjectTemplateEn: 'Approved',
        bodyTemplate: 'تم اعتماد {{title}}', bodyTemplateEn: '{{title}} has been approved',
        variables: ['title'] },
      { id: 'approval-rejected-inapp', eventName: 'ApprovalRejected', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تم الرفض', subjectTemplateEn: 'Rejected',
        bodyTemplate: 'تم رفض {{title}}', bodyTemplateEn: '{{title}} has been rejected',
        variables: ['title'] },
      { id: 'approval-cancelled-inapp', eventName: 'ApprovalCancelled', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تم الإلغاء', subjectTemplateEn: 'Cancelled',
        bodyTemplate: 'تم إلغاء {{title}}', bodyTemplateEn: '{{title}} has been cancelled',
        variables: ['title'] },
      { id: 'extract-created-inapp', eventName: 'ExtractCreated', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'خلاصة جديدة', subjectTemplateEn: 'New Extract',
        bodyTemplate: 'تم إنشاء خلاصة بقيمة {{amount}}', bodyTemplateEn: 'Extract created for {{amount}}',
        variables: ['amount'] },
      { id: 'extract-approved-inapp', eventName: 'ExtractApproved', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تم اعتماد الخلاصة', subjectTemplateEn: 'Extract Approved',
        bodyTemplate: 'تم اعتماد الخلاصة بقيمة {{netPayable}}', bodyTemplateEn: 'Extract approved for {{netPayable}}',
        variables: ['netPayable'] },
      { id: 'payment-created-inapp', eventName: 'PaymentCreated', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'دفعة جديدة', subjectTemplateEn: 'New Payment',
        bodyTemplate: 'تم إنشاء دفعة بقيمة {{amount}}', bodyTemplateEn: 'Payment of {{amount}} created',
        variables: ['amount'] },
      { id: 'payment-approved-inapp', eventName: 'PaymentApproved', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تم اعتماد الدفعة', subjectTemplateEn: 'Payment Approved',
        bodyTemplate: 'تم اعتماد الدفعة بقيمة {{amount}}', bodyTemplateEn: 'Payment of {{amount}} approved',
        variables: ['amount'] },
      { id: 'attendance-checkin-inapp', eventName: 'AttendanceCheckedIn', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تسجيل دخول', subjectTemplateEn: 'Check In',
        bodyTemplate: 'تم تسجيل دخولك الساعة {{checkInTime}}', bodyTemplateEn: 'You checked in at {{checkInTime}}',
        variables: ['checkInTime'] },
      { id: 'attendance-checkout-inapp', eventName: 'AttendanceCheckedOut', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تسجيل خروج', subjectTemplateEn: 'Check Out',
        bodyTemplate: 'تم تسجيل خروجك. مدة العمل: {{workedMinutes}} دقيقة', bodyTemplateEn: 'You checked out. Worked: {{workedMinutes}} minutes',
        variables: ['workedMinutes'] },
      { id: 'fund-tx-inapp', eventName: 'FundTransactionCreated', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'معاملة عهدة', subjectTemplateEn: 'Fund Transaction',
        bodyTemplate: '{{type}}: {{amount}} - {{description}}', bodyTemplateEn: '{{type}}: {{amount}} - {{description}}',
        variables: ['type', 'amount', 'description'] },
      { id: 'attendance-override-requested-inapp', eventName: 'AttendanceOverrideRequested', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'طلب تصحيح حضور', subjectTemplateEn: 'Attendance Override Request',
        bodyTemplate: 'طلب تصحيح حضور بانتظار موافقتك: {{reason}}', bodyTemplateEn: 'An attendance override request awaits your approval: {{reason}}',
        variables: ['reason'] },
      { id: 'attendance-override-approved-inapp', eventName: 'AttendanceOverrideApproved', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تمت الموافقة على تصحيح الحضور', subjectTemplateEn: 'Attendance Override Approved',
        bodyTemplate: 'تمت الموافقة على طلب تصحيح الحضور الخاص بك', bodyTemplateEn: 'Your attendance override request was approved',
        variables: [] },
      { id: 'attendance-override-rejected-inapp', eventName: 'AttendanceOverrideRejected', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تم رفض تصحيح الحضور', subjectTemplateEn: 'Attendance Override Rejected',
        bodyTemplate: 'تم رفض طلب تصحيح الحضور الخاص بك', bodyTemplateEn: 'Your attendance override request was rejected',
        variables: ['comment'] },
      { id: 'stock-movement-created-inapp', eventName: 'StockMovementCreated', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'حركة مخزون', subjectTemplateEn: 'Stock Movement',
        bodyTemplate: 'تم تسجيل حركة مخزون: {{type}} - الكمية {{quantity}}', bodyTemplateEn: 'Stock movement recorded: {{type}} - quantity {{quantity}}',
        variables: ['type', 'quantity'] },
      { id: 'boq-uploaded-inapp', eventName: 'BOQUploaded', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تم رفع المقايسة', subjectTemplateEn: 'BOQ Uploaded',
        bodyTemplate: 'تم رفع مقايسة {{boqType}} بعدد {{itemCount}} بند', bodyTemplateEn: '{{boqType}} BOQ uploaded with {{itemCount}} items',
        variables: ['boqType', 'itemCount'] },
      { id: 'boq-updated-inapp', eventName: 'BOQUpdated', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تم تحديث المقايسة', subjectTemplateEn: 'BOQ Updated',
        bodyTemplate: 'تم تحديث البند {{businessCode}}', bodyTemplateEn: 'BOQ item {{businessCode}} was updated',
        variables: ['businessCode'] },
      { id: 'extract-approved-inapp', eventName: 'ExtractApproved', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تم اعتماد الخلاصة', subjectTemplateEn: 'Extract Approved',
        bodyTemplate: 'تم اعتماد الخلاصة بقيمة {{netPayable}}', bodyTemplateEn: 'Extract approved for {{netPayable}}',
        variables: ['netPayable'] },
      { id: 'project-status-changed-inapp', eventName: 'ProjectStatusChanged', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'تغير حالة المشروع', subjectTemplateEn: 'Project Status Changed',
        bodyTemplate: 'تغيرت حالة المشروع من {{from}} إلى {{to}}', bodyTemplateEn: 'Project status changed from {{from}} to {{to}}',
        variables: ['from', 'to'] },
      { id: 'project-completed-inapp', eventName: 'ProjectCompleted', channel: NotificationChannel.IN_APP,
        subjectTemplate: 'اكتمل المشروع', subjectTemplateEn: 'Project Completed',
        bodyTemplate: 'تم إكمال المشروع {{name}}', bodyTemplateEn: 'Project {{name}} has been completed',
        variables: ['name'] },
    ];

    for (const t of templates) {
      this.templateRenderer.register(t);
    }
  }
}
