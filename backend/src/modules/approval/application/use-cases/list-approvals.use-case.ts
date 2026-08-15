import { IApprovalRepository, ApprovalListItem } from '../../domain/approval.repository';
import { Result } from '@/shared/kernel/result';

export class ListApprovalsUseCase {
  constructor(private readonly repo: IApprovalRepository) {}

  async execute(
    params: { status?: string; entityType?: string; skip?: number; take?: number },
    viewer?: { userId?: string; isAdmin?: boolean },
  ): Promise<Result<{ items: ApprovalListItem[]; total: number }>> {
    try {
      // Scope approvals: a non-admin sees only their own requests, while an
      // administrator sees the full company list.
      const requestedBy = viewer && !viewer.isAdmin ? viewer.userId : undefined;
      const scoped = requestedBy ? { ...params, requestedBy } : params;
      const [items, total] = await Promise.all([this.repo.findMany(scoped), this.repo.count(scoped)]);
      return Result.ok({ items, total });
    } catch (error: any) {
      return Result.fail(error);
    }
  }
}
