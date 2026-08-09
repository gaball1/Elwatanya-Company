import { Result } from '@/shared/kernel/result';
import { ProjectFund } from '../../domain/project-fund.entity';
import { ProjectFundResult } from '../dto/project-fund.dto';

export function toResult(f: ProjectFund): ProjectFundResult {
  return {
    id: f.id.toValue(),
    projectId: f.projectId,
    initialBalance: f.initialBalance,
    currentBalance: f.currentBalance,
    lastUpdated: f.lastUpdated,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

export class ListProjectFundsUseCase {
  constructor(private readonly funds: import('../../domain/project-fund.repository').IProjectFundRepository) {}

  async execute(): Promise<Result<ProjectFundResult[]>> {
    const list = await this.funds.findAll();
    return Result.ok(list.map(toResult));
  }
}
