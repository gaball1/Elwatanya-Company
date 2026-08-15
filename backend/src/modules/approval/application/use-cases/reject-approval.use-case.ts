import { Approval } from '@prisma/client';
import { IApprovalRepository } from '../../domain/approval.repository';
import { Result } from '@/shared/kernel/result';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { ApprovalRejectedEvent } from '@/modules/domain-events/events';
import { AuditService } from '@/modules/audit/audit.service';

export class RejectApprovalUseCase {
  constructor(
    private readonly repo: IApprovalRepository,
    private readonly eventBus: EventBusImpl,
    private readonly audit?: AuditService,
  ) {}

  async execute(id: string, approvedBy: string, comment?: string, ip?: string): Promise<Result<Approval>> {
    try {
      const existing = await this.repo.findById(id);
      if (!existing) return Result.fail(new Error('Approval request not found'));
      if (existing.requestedBy === approvedBy) {
        return Result.fail(new Error('You cannot reject your own request'));
      }
      // Atomic transition guards against concurrent approve/reject double side-effects.
      const updated = await this.repo.transition(id, 'pending', 'rejected', {
        approvedBy,
        comment: comment ?? '',
        approvedAt: new Date(),
      });
      if (!updated) {
        const existing = await this.repo.findById(id);
        if (!existing) return Result.fail(new Error('Approval request not found'));
        return Result.fail(new Error('Only pending requests can be rejected'));
      }
      const target = updated as Approval;
      await this.audit?.log({
        userId: approvedBy,
        action: `approval.rejected`,
        entity: 'approval',
        entityId: id,
        metadata: {
          entityType: target.entityType,
          entityId: target.entityId,
          requestedBy: target.requestedBy,
          comment: comment ?? '',
        },
        ip,
      });
      await this.eventBus.publish(
        new ApprovalRejectedEvent(
          updated.id,
          'approval',
          {
            id: updated.id,
            entityType: updated.entityType,
            entityId: updated.entityId,
            title: updated.entityType,
            rejectedBy: approvedBy,
            reason: comment ?? undefined,
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
