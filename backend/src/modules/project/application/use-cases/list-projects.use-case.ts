import { Result } from '@/shared/kernel/result';
import { IProjectRepository } from '../../domain/project.repository';
import { ProjectResult } from '../dto/project.result';
import { toProjectResult } from './create-project.use-case';
import { OwnershipService, OwnershipActor } from '@/common/services/ownership.service';

export class ListProjectsUseCase {
  constructor(
    private readonly projects: IProjectRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(actor?: OwnershipActor): Promise<Result<ProjectResult[]>> {
    const projects = await this.projects.findAll();

    // SUPER_ADMIN sees every project; other users only see the projects they
    // are assigned to. A user with no assignment sees an empty list.
    if (actor && typeof actor === 'object') {
      if (Array.isArray(actor.roleNames) && actor.roleNames.includes('SUPER_ADMIN')) {
        return Result.ok(projects.map(toProjectResult));
      }
      const allowed = actor.projectIds?.length ? actor.projectIds : actor.projectId ? [actor.projectId] : [];
      if (allowed.length === 0) {
        return Result.ok([]);
      }
      return Result.ok(
        projects.filter((p) => allowed.includes(p.id.toValue())).map(toProjectResult),
      );
    }

    // Legacy callers passed a single project id.
    const single = actor as string | null | undefined;
    if (!single) {
      return Result.ok([]);
    }
    return Result.ok(projects.filter((p) => p.id.toValue() === single).map(toProjectResult));
  }
}
