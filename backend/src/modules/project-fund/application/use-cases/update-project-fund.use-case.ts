import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IProjectFundRepository } from '../../domain/project-fund.repository';
import { UpdateProjectFundInput, ProjectFundResult } from '../dto/project-fund.dto';
import { toResult } from './list-project-funds.use-case';

export class UpdateProjectFundUseCase {
  constructor(private readonly funds: IProjectFundRepository) {}

  async execute(input: UpdateProjectFundInput): Promise<Result<ProjectFundResult>> {
    const fund = await this.funds.findById(new UniqueEntityId(input.id));
    if (!fund) return Result.fail(new Error('Project fund not found'));

    const updateResult = fund.update({
      initialBalance: input.initialBalance,
      currentBalance: input.currentBalance,
      pettyCashBalance: input.pettyCashBalance,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.funds.save(fund);
    return Result.ok(toResult(fund));
  }
}
