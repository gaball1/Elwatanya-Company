import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IProjectFundRepository } from '../../domain/project-fund.repository';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class DeleteProjectFundUseCase {
  constructor(
    private readonly funds: IProjectFundRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(id: string, user: OwnershipActor | undefined): Promise<Result<void>> {
    const fund = await this.funds.findById(new UniqueEntityId(id));
    if (!fund) return Result.fail(new Error('Project fund not found'));

    await this.ownership.verifyProjectAccess(user, fund.projectId);

    const deleteResult = fund.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.funds.save(fund);
    return Result.ok();
  }
}
