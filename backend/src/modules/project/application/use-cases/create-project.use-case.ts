import { Result } from '@/shared/kernel/result';
import { Project } from '../../domain/project.entity';
import { ProjectCode } from '../../domain/value-objects/project-code.vo';
import { IProjectRepository } from '../../domain/project.repository';
import { CreateProjectInput } from '../dto/create-project.input';
import { ProjectResult } from '../dto/project.result';
import {
  ProjectApplicationError,
  ProjectErrorCode,
} from '../errors/project-application.error';

export class CreateProjectUseCase {
  constructor(private readonly projects: IProjectRepository) {}

  async execute(input: CreateProjectInput): Promise<Result<ProjectResult>> {
    const codeResult = ProjectCode.create(input.code);
    if (codeResult.isFailure) {
      return Result.fail(
        new ProjectApplicationError(
          ProjectErrorCode.INVALID_CODE,
          codeResult.error?.message ?? 'Invalid project code',
        ),
      );
    }

    const code = codeResult.getValue();
    if (await this.projects.existsByCode(code)) {
      return Result.fail(
        new ProjectApplicationError(
          ProjectErrorCode.CODE_ALREADY_EXISTS,
          'Project code already exists',
        ),
      );
    }

    const projectResult = Project.create({ code, name: input.name });
    if (projectResult.isFailure) {
      return Result.fail(
        new ProjectApplicationError(
          ProjectErrorCode.INVALID_NAME,
          projectResult.error?.message ?? 'Invalid project name',
        ),
      );
    }

    const project = projectResult.getValue();
    await this.projects.save(project);

    return Result.ok(toProjectResult(project));
  }
}

export function toProjectResult(project: Project): ProjectResult {
  return {
    id: project.id.toValue(),
    code: project.code.value,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
