import { Result } from '@/shared/kernel/result';
import { IProjectRepository } from '../../domain/project.repository';
import { ProjectResult } from '../dto/project.result';
import { toProjectResult } from './create-project.use-case';
import { OwnershipService } from '@/common/services/ownership.service';

export class ListProjectsUseCase {
  constructor(
    private readonly projects: IProjectRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(userProjectId?: string | null): Promise<Result<ProjectResult[]>> {
    const projects = await this.projects.findAll();
    if (userProjectId) {
      return Result.ok(projects.filter((p) => p.id.toValue() === userProjectId).map(toProjectResult));
    }
    return Result.ok(projects.map(toProjectResult));
  }
}
