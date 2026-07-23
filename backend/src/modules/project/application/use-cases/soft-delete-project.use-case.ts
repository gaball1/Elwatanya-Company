import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IProjectRepository } from '../../domain/project.repository';
import {
  ProjectApplicationError,
  ProjectErrorCode,
} from '../errors/project-application.error';

export class SoftDeleteProjectUseCase {
  constructor(private readonly projects: IProjectRepository) {}

  async execute(projectId: string): Promise<Result<void>> {
    const project = await this.projects.findById(new UniqueEntityId(projectId));
    if (!project) {
      return Result.fail(
        new ProjectApplicationError(ProjectErrorCode.NOT_FOUND, 'Project not found'),
      );
    }

    const deleteResult = project.softDelete();
    if (deleteResult.isFailure) {
      return Result.fail(
        new ProjectApplicationError(
          ProjectErrorCode.ALREADY_DELETED,
          deleteResult.error?.message ?? 'Project is already deleted',
        ),
      );
    }

    await this.projects.save(project);
    return Result.ok();
  }
}
