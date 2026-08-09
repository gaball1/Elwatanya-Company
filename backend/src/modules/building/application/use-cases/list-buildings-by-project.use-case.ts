import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '../../domain/building.repository';
import { IProjectRepository } from '@/modules/project/domain/project.repository';
import { OwnershipService } from '@/common/services/ownership.service';
import { BuildingResult } from '../dto/building.dto';
import { toBuildingResult } from './create-building.use-case';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '../errors/building-application.error';

export class ListBuildingsByProjectUseCase {
  constructor(
    private readonly buildings: IBuildingRepository,
    private readonly projects: IProjectRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(projectId: string, userProjectId?: string | null): Promise<Result<BuildingResult[]>> {
    await this.ownership.verifyProjectAccess(userProjectId, projectId);
    const id = new UniqueEntityId(projectId);
    const project = await this.projects.findById(id);
    if (!project) {
      return Result.fail(
        new BuildingApplicationError(
          BuildingErrorCode.PROJECT_NOT_FOUND,
          'Project not found',
        ),
      );
    }

    const buildings = await this.buildings.findByProjectId(id);
    return Result.ok(buildings.map(toBuildingResult));
  }
}
