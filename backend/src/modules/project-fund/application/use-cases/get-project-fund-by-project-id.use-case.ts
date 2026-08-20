import { Result } from '@/shared/kernel/result';
import { ProjectFund } from '../../domain/project-fund.entity';
import { ProjectFundResult } from '../dto/project-fund.dto';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { IProjectFundRepository } from '../../domain/project-fund.repository';
import { toResult } from './list-project-funds.use-case';

export class GetProjectFundByProjectIdUseCase {
  constructor(
    private readonly funds: IProjectFundRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(projectId: string, user?: OwnershipActor): Promise<Result<ProjectFundResult | null>> {
    try {
      const accessible = this.ownership.getAccessibleProjectIds(user);
      if (accessible !== null && !accessible.includes(projectId)) {
        return Result.ok(null);
      }
      const fund = await this.funds.findByProjectId(projectId);
      return Result.ok(fund ? toResult(fund) : null);
    } catch (error: any) {
      return Result.fail(error);
    }
  }
}
