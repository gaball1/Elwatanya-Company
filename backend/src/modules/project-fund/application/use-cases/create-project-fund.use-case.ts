import { Result } from '@/shared/kernel/result';
import { IProjectFundRepository } from '../../domain/project-fund.repository';
import { CreateProjectFundInput, ProjectFundResult } from '../dto/project-fund.dto';
import { ProjectFund } from '../../domain/project-fund.entity';
import { toResult } from './list-project-funds.use-case';

export class CreateProjectFundUseCase {
  constructor(private readonly funds: IProjectFundRepository) {}

  async execute(input: CreateProjectFundInput): Promise<Result<ProjectFundResult>> {
    const existing = await this.funds.findByProjectId(input.projectId);
    if (existing) return Result.fail(new Error('Project fund already exists for this project'));

    // A soft-deleted fund still occupies the unique projectId constraint. Restore it
    // instead of trying to insert a duplicate, which would violate the constraint.
    const deleted = await this.funds.findDeletedByProjectId(input.projectId);
    if (deleted) {
      const restoreResult = deleted.restore(input.initialBalance ?? 0);
      if (restoreResult.isFailure) return Result.fail(restoreResult.error as Error);
      await this.funds.save(deleted);
      return Result.ok(toResult(deleted));
    }

    const result = ProjectFund.create({
      projectId: input.projectId,
      initialBalance: input.initialBalance,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const fund = result.getValue();
    await this.funds.save(fund);
    return Result.ok(toResult(fund));
  }
}
