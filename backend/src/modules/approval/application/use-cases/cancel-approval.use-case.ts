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
      // Try pending first; if that race fails, try draft. Atomic transitions guarantee a
      // single winner when approve/reject/cancel fire concurrently.
      let updated = await this.repo.transition(id, 'pending', 'cancelled', {
        approvedBy: cancelledBy,
        comment: reason ?? undefined,
      });
      if (!updated) {
        updated = await this.repo.transition(id, 'draft', 'cancelled', {
          approvedBy: cancelledBy,
          comment: reason ?? undefined,
        });
      }
      if (!updated) {
        const existing = await this.repo.findById(id);
        if (!existing) return Result.fail(new Error('Approval request not found'));
        return Result.fail(new Error('Only draft or pending requests can be cancelled'));
      }
      await this.eventBus.publish(
        new ApprovalCancelledEvent(
          updated.id,
          'approval',
          {
            id: updated.id,
            entityType: updated.entityType,
            entityId: updated.entityId,
            title: updated.entityType,
            cancelledBy,
            reason: reason ?? undefined,
            recipientIds: [updated.requestedBy],
          },
        ),
      );
      return Result.ok(updated);
    } catch (error: any) {
      return Result.fail(error);
    }
  }
}
