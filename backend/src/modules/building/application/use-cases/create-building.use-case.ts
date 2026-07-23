import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Building } from '../../domain/building.entity';
import { IBuildingRepository } from '../../domain/building.repository';
import { IProjectRepository } from '@/modules/project/domain/project.repository';
import { CreateBuildingInput, BuildingResult } from '../dto/building.dto';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '../errors/building-application.error';

export class CreateBuildingUseCase {
  constructor(
    private readonly buildings: IBuildingRepository,
    private readonly projects: IProjectRepository,
  ) {}

  async execute(input: CreateBuildingInput): Promise<Result<BuildingResult>> {
    const projectId = new UniqueEntityId(input.projectId);
    const project = await this.projects.findById(projectId);
    if (!project) {
      return Result.fail(
        new BuildingApplicationError(
          BuildingErrorCode.PROJECT_NOT_FOUND,
          'Project not found',
        ),
      );
    }

    const buildingResult = Building.create({
      projectId,
      name: input.name,
    });
    if (buildingResult.isFailure) {
      return Result.fail(
        new BuildingApplicationError(
          BuildingErrorCode.INVALID_NAME,
          buildingResult.error?.message ?? 'Invalid building name',
        ),
      );
    }

    const building = buildingResult.getValue();
    if (await this.buildings.existsByNameInProject(projectId, building.name)) {
      return Result.fail(
        new BuildingApplicationError(
          BuildingErrorCode.NAME_ALREADY_EXISTS,
          'Building name already exists in this project',
        ),
      );
    }

    await this.buildings.save(building);
    return Result.ok(toBuildingResult(building));
  }
}

export function toBuildingResult(building: Building): BuildingResult {
  return {
    id: building.id.toValue(),
    projectId: building.projectId.toValue(),
    name: building.name,
    createdAt: building.createdAt,
    updatedAt: building.updatedAt,
  };
}
