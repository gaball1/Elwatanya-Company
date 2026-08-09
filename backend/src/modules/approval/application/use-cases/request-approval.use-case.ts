import { Approval } from '@prisma/client';
import { IApprovalRepository } from '../../domain/approval.repository';
import { Result } from '@/shared/kernel/result';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { ApprovalRequestedEvent } from '@/modules/domain-events/events';

export class RequestApprovalUseCase {
  constructor(
    private readonly repo: IApprovalRepository,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(data: { entityType: string; entityId: string; requestedBy: string; comment?: string; status?: 'draft' | 'pending' }): Promise<Result<Approval>> {
    try {
      const status = data.status ?? 'pending';
      const existing = await this.repo.findByEntity(data.entityType, data.entityId);
      if (existing && existing.status !== 'cancelled' && existing.status !== 'rejected') {
        return Result.fail(new Error('Approval request already exists for this entity'));
      }
      let approval: Approval;
      if (existing) {
        approval = await this.repo.reset({
          id: existing.id,
          requestedBy: data.requestedBy,
          comment: data.comment,
          status,
        });
      } else {
        approval = await this.repo.create({
          entityType: data.entityType,
          entityId: data.entityId,
          requestedBy: data.requestedBy,
          comment: data.comment,
          status,
        });
      }
      if (status === 'pending') {
        await this.eventBus.publish(
          new ApprovalRequestedEvent(
            approval.id,
            'approval',
            {
              id: approval.id,
              entityType: data.entityType,
              entityId: data.entityId,
              title: data.entityType,
              requestedBy: data.requestedBy,
              permission: 'approvals.approve',
            },
          ),
        );
      }
      return Result.ok(approval);
    } catch (error: any) {
      return Result.fail(error);
    }
  }
}
