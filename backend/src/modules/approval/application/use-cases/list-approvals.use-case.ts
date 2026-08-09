import { Approval } from '@prisma/client';
import { IApprovalRepository } from '../../domain/approval.repository';
import { Result } from '@/shared/kernel/result';

export class ListApprovalsUseCase {
  constructor(private readonly repo: IApprovalRepository) {}

  async execute(params: { status?: string; entityType?: string; skip?: number; take?: number }): Promise<Result<{ items: Approval[]; total: number }>> {
    try {
      const [items, total] = await Promise.all([this.repo.findMany(params), this.repo.count(params)]);
      return Result.ok({ items, total });
    } catch (error: any) {
      return Result.fail(error);
    }
  }
}
