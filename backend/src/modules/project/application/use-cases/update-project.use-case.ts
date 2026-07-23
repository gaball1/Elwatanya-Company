import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IProjectRepository } from '../../domain/project.repository';
import { UpdateProjectInput } from '../dto/update-project.input';
import { ProjectResult } from '../dto/project.result';
import { toProjectResult } from './create-project.use-case';
import {
  ProjectApplicationError,
  ProjectErrorCode,
} from '../errors/project-application.error';

export class UpdateProjectUseCase {
  constructor(private readonly projects: IProjectRepository) {}

  async execute(input: UpdateProjectInput): Promise<Result<ProjectResult>> {
    const project = await this.projects.findById(new UniqueEntityId(input.projectId));
    if (!project) {
      return Result.fail(
        new ProjectApplicationError(ProjectErrorCode.NOT_FOUND, 'Project not found'),
      );
    }

    const renameResult = project.rename(input.name);
    if (renameResult.isFailure) {
      const message = renameResult.error?.message ?? 'Unable to update project';
      const code = project.isDeleted
        ? ProjectErrorCode.ALREADY_DELETED
        : ProjectErrorCode.INVALID_NAME;
      return Result.fail(new ProjectApplicationError(code, message));
    }

    await this.projects.save(project);
    return Result.ok(toProjectResult(project));
  }
}
