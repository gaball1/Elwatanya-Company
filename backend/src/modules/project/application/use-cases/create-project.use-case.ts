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
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { ProjectCreatedEvent } from '@/modules/domain-events/events';

export class CreateProjectUseCase {
  constructor(
    private readonly projects: IProjectRepository,
    private readonly eventBus: EventBusImpl,
  ) {}

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

    const projectResult = Project.create({
      code,
      name: input.name,
      location: input.location,
      description: input.description,
      client: input.client,
      startDate: input.startDate,
      status: input.status,
      progress: input.progress,
    });
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

    await this.eventBus.publish(
      new ProjectCreatedEvent(
        project.id.toValue(),
        'project',
        {
          id: project.id.toValue(),
          name: project.name,
          code: project.code.value,
          client: project.client ?? '',
          status: project.status,
          createdBy: undefined,
          notifyAll: true,
        },
      ),
    );

    return Result.ok(toProjectResult(project));
  }
}

export function toProjectResult(project: Project): ProjectResult {
  return {
    id: project.id.toValue(),
    code: project.code.value,
    name: project.name,
    location: project.location,
    description: project.description,
    client: project.client,
    startDate: project.startDate,
    status: project.status,
    progress: project.progress,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
