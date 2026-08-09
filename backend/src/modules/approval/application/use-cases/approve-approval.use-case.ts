import { Approval } from '@prisma/client';
import { IApprovalRepository } from '../../domain/approval.repository';
import { Result } from '@/shared/kernel/result';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { ApprovalApprovedEvent } from '@/modules/domain-events/events';

export class ApproveApprovalUseCase {
  constructor(
    private readonly repo: IApprovalRepository,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(id: string, approvedBy: string, comment?: string): Promise<Result<Approval>> {
    try {
      const approval = await this.repo.findById(id);
      if (!approval) return Result.fail(new Error('Approval request not found'));
      if (approval.status !== 'pending') return Result.fail(new Error('Only pending requests can be approved'));
      const updated = await this.repo.update(id, { status: 'approved', approvedBy, comment: comment ?? '', approvedAt: new Date() });
      await this.eventBus.publish(
        new ApprovalApprovedEvent(
          approval.id,
          'approval',
          {
            id: approval.id,
            entityType: approval.entityType,
            entityId: approval.entityId,
            title: approval.entityType,
            approvedBy,
            recipientIds: [approval.requestedBy],
          },
        ),
      );
      return Result.ok(updated);
    } catch (error: any) {
      return Result.fail(error);
    }
  }
}
