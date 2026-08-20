import { IApprovalRepository, ApprovalListItem } from '../../domain/approval.repository';
import { Result } from '@/shared/kernel/result';

export class GetApprovalByIdUseCase {
  constructor(private readonly repo: IApprovalRepository) {}

  async execute(id: string): Promise<Result<ApprovalListItem>> {
    try {
      const approval = await this.repo.findByIdWithNames(id);
      if (!approval) return Result.fail(new Error('Approval not found'));
      return Result.ok(approval);
    } catch (error: any) {
      return Result.fail(error);
    }
  }
}
