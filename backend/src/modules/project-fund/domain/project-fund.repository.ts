import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ProjectFund } from './project-fund.entity';

export const PROJECT_FUND_REPOSITORY = Symbol('PROJECT_FUND_REPOSITORY');

export interface IProjectFundRepository {
  save(fund: ProjectFund): Promise<void>;
  findById(id: UniqueEntityId): Promise<ProjectFund | null>;
  findByProjectId(projectId: string): Promise<ProjectFund | null>;
  findDeletedByProjectId(projectId: string): Promise<ProjectFund | null>;
  findAll(projectIds?: string[]): Promise<ProjectFund[]>;
}
