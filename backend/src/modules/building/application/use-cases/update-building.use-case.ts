import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '../../domain/building.repository';
import { OwnershipService } from '@/common/services/ownership.service';
import { UpdateBuildingInput, BuildingResult } from '../dto/building.dto';
import { toBuildingResult } from './create-building.use-case';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '../errors/building-application.error';

export class UpdateBuildingUseCase {
  constructor(
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(input: UpdateBuildingInput, userProjectId?: string | null): Promise<Result<BuildingResult>> {
    await this.ownership.verifyBuildingAccess(userProjectId, input.buildingId);
    const building = await this.buildings.findById(new UniqueEntityId(input.buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const updateResult = building.update({
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
    if (updateResult.isFailure) {
      const code = building.isDeleted
        ? BuildingErrorCode.ALREADY_DELETED
        : BuildingErrorCode.INVALID_NAME;
      return Result.fail(
        new BuildingApplicationError(code, updateResult.error?.message ?? 'Unable to update'),
      );
    }

    if (
      input.name !== undefined &&
      await this.buildings.existsByNameInProject(
        building.projectId,
        building.name,
        building.id,
      )
    ) {
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
