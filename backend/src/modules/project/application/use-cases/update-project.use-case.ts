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
import { OwnershipService } from '@/common/services/ownership.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { ProjectStatusChangedEvent, ProjectCompletedEvent } from '@/modules/domain-events/events';

export class UpdateProjectUseCase {
  constructor(
    private readonly projects: IProjectRepository,
    private readonly ownership: OwnershipService,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(input: UpdateProjectInput, userProjectId?: string | null): Promise<Result<ProjectResult>> {
    await this.ownership.verifyProjectAccess(userProjectId, input.projectId);
    const project = await this.projects.findById(new UniqueEntityId(input.projectId));
    if (!project) {
      return Result.fail(
        new ProjectApplicationError(ProjectErrorCode.NOT_FOUND, 'Project not found'),
      );
    }

    const previousStatus = project.status;

    const updateResult = project.update({
      name: input.name,
      location: input.location,
      description: input.description,
      client: input.client,
      startDate: input.startDate,
      status: input.status,
      progress: input.progress,
    });
    if (updateResult.isFailure) {
      const message = updateResult.error?.message ?? 'Unable to update project';
      const code = project.isDeleted
        ? ProjectErrorCode.ALREADY_DELETED
        : ProjectErrorCode.INVALID_NAME;
      return Result.fail(new ProjectApplicationError(code, message));
    }

    await this.projects.save(project);

    if (input.status && input.status !== previousStatus) {
      await this.eventBus.publish(
        new ProjectStatusChangedEvent(
          project.id.toValue(),
          'project',
          {
            id: project.id.toValue(),
            from: previousStatus,
            to: input.status,
            changedBy: undefined,
          },
        ),
      );
      if (input.status === 'completed') {
        await this.eventBus.publish(
          new ProjectCompletedEvent(
            project.id.toValue(),
            'project',
            {
              id: project.id.toValue(),
              name: project.name,
              completedAt: new Date(),
            },
          ),
        );
      }
    }

    return Result.ok(toProjectResult(project));
  }
}
