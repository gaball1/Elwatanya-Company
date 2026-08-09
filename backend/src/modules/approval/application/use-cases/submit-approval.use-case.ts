import { Approval } from '@prisma/client';
import { IApprovalRepository } from '../../domain/approval.repository';
import { Result } from '@/shared/kernel/result';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { ApprovalRequestedEvent } from '@/modules/domain-events/events';

export class SubmitApprovalUseCase {
  constructor(
    private readonly repo: IApprovalRepository,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(id: string, submittedBy: string, comment?: string): Promise<Result<Approval>> {
    try {
      const approval = await this.repo.findById(id);
      if (!approval) return Result.fail(new Error('Approval request not found'));
      if (approval.status !== 'draft') return Result.fail(new Error('Only draft requests can be submitted'));
      const updated = await this.repo.update(id, { status: 'pending', comment: comment ?? approval.comment ?? '' });
      await this.eventBus.publish(
        new ApprovalRequestedEvent(
          approval.id,
          'approval',
          {
            id: approval.id,
            entityType: approval.entityType,
            entityId: approval.entityId,
            title: approval.entityType,
            requestedBy: submittedBy,
            permission: 'approvals.approve',
          },
        ),
      );
      return Result.ok(updated);
    } catch (error: any) {
      return Result.fail(error);
    }
  }
}
