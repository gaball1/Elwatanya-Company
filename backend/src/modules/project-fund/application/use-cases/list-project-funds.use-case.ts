import { Result } from '@/shared/kernel/result';
import { ProjectFund } from '../../domain/project-fund.entity';
import { ProjectFundResult } from '../dto/project-fund.dto';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export function toResult(f: ProjectFund): ProjectFundResult {
  return {
    id: f.id.toValue(),
    projectId: f.projectId,
    initialBalance: f.initialBalance,
    currentBalance: f.currentBalance,
    pettyCashBalance: f.pettyCashBalance,
    lastUpdated: f.lastUpdated,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

export class ListProjectFundsUseCase {
  constructor(
    private readonly funds: import('../../domain/project-fund.repository').IProjectFundRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(user?: OwnershipActor): Promise<Result<ProjectFundResult[]>> {
    const accessible = this.ownership.getAccessibleProjectIds(user);
    const projectIds = accessible === null ? undefined : accessible.length > 0 ? accessible : [];
    const list = await this.funds.findAll(projectIds);
    return Result.ok(list.map(toResult));
  }
}
