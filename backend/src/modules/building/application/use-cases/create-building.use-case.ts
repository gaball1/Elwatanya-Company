import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Building } from '../../domain/building.entity';
import { IBuildingRepository } from '../../domain/building.repository';
import { IProjectRepository } from '@/modules/project/domain/project.repository';
import { OwnershipService } from '@/common/services/ownership.service';
import { CreateBuildingInput, BuildingResult } from '../dto/building.dto';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '../errors/building-application.error';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { BuildingCreatedEvent } from '@/modules/domain-events/events';

export class CreateBuildingUseCase {
  constructor(
    private readonly buildings: IBuildingRepository,
    private readonly projects: IProjectRepository,
    private readonly ownership: OwnershipService,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(input: CreateBuildingInput, userProjectId?: string | null): Promise<Result<BuildingResult>> {
    await this.ownership.verifyProjectAccess(userProjectId, input.projectId);
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
      code: input.code,
      type: input.type,
      startDate: input.startDate,
      description: input.description,
      status: input.status,
      latitude: input.latitude,
      longitude: input.longitude,
      allowedRadius: input.allowedRadius,
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

    await this.eventBus.publish(
      new BuildingCreatedEvent(
        building.id.toValue(),
        'building',
        {
          id: building.id.toValue(),
          name: building.name,
          code: building.code,
          projectId: building.projectId.toValue(),
          createdBy: undefined,
        },
      ),
    );

    return Result.ok(toBuildingResult(building));
  }
}

export function toBuildingResult(building: Building): BuildingResult {
  return {
    id: building.id.toValue(),
    projectId: building.projectId.toValue(),
    name: building.name,
    code: building.code,
    type: building.type,
    startDate: building.startDate,
    description: building.description,
    status: building.status,
    latitude: building.latitude,
    longitude: building.longitude,
    allowedRadius: building.allowedRadius,
    createdAt: building.createdAt,
    updatedAt: building.updatedAt,
  };
}
