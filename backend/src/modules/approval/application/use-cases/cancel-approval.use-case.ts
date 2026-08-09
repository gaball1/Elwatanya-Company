import { Approval } from '@prisma/client';
import { IApprovalRepository } from '../../domain/approval.repository';
import { Result } from '@/shared/kernel/result';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { ApprovalCancelledEvent } from '@/modules/domain-events/events';

export class CancelApprovalUseCase {
  constructor(
    private readonly repo: IApprovalRepository,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(id: string, cancelledBy: string, reason?: string): Promise<Result<Approval>> {
    try {
      const approval = await this.repo.findById(id);
      if (!approval) return Result.fail(new Error('Approval request not found'));
      if (approval.status !== 'draft' && approval.status !== 'pending') {
        return Result.fail(new Error('Only draft or pending requests can be cancelled'));
      }
      const updated = await this.repo.update(id, { status: 'cancelled', approvedBy: cancelledBy, comment: reason ?? approval.comment ?? '' });
      await this.eventBus.publish(
        new ApprovalCancelledEvent(
          approval.id,
          'approval',
          {
            id: approval.id,
            entityType: approval.entityType,
            entityId: approval.entityId,
            title: approval.entityType,
            cancelledBy,
            reason: reason ?? undefined,
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
