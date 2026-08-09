import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IProjectFundRepository } from '../../domain/project-fund.repository';

export class DeleteProjectFundUseCase {
  constructor(private readonly funds: IProjectFundRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const fund = await this.funds.findById(new UniqueEntityId(id));
    if (!fund) return Result.fail(new Error('Project fund not found'));

    const deleteResult = fund.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.funds.save(fund);
    return Result.ok();
  }
}
