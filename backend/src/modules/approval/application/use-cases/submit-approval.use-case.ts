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
      // Atomic transition guards against double-submit race.
      const updated = await this.repo.transition(id, 'draft', 'pending', {
        comment: comment ?? undefined,
      });
      if (!updated) {
        const existing = await this.repo.findById(id);
        if (!existing) return Result.fail(new Error('Approval request not found'));
        return Result.fail(new Error('Only draft requests can be submitted'));
      }
      await this.eventBus.publish(
        new ApprovalRequestedEvent(
          updated.id,
          'approval',
          {
            id: updated.id,
            entityType: updated.entityType,
            entityId: updated.entityId,
            title: updated.entityType,
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
