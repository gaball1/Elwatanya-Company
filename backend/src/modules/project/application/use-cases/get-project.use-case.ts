import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IProjectRepository } from '../../domain/project.repository';
import { ProjectResult } from '../dto/project.result';
import { toProjectResult } from './create-project.use-case';
import {
  ProjectApplicationError,
  ProjectErrorCode,
} from '../errors/project-application.error';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class GetProjectUseCase {
  constructor(
    private readonly projects: IProjectRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(projectId: string, user?: OwnershipActor): Promise<Result<ProjectResult>> {
    await this.ownership.verifyProjectAccess(user, projectId);

    const project = await this.projects.findById(new UniqueEntityId(projectId));
    if (!project) {
      return Result.fail(
        new ProjectApplicationError(ProjectErrorCode.NOT_FOUND, 'Project not found'),
      );
    }

    return Result.ok(toProjectResult(project));
  }
}
