import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '../../domain/building.repository';
import { UpdateBuildingInput, BuildingResult } from '../dto/building.dto';
import { toBuildingResult } from './create-building.use-case';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '../errors/building-application.error';

export class UpdateBuildingUseCase {
  constructor(private readonly buildings: IBuildingRepository) {}

  async execute(input: UpdateBuildingInput): Promise<Result<BuildingResult>> {
    const building = await this.buildings.findById(new UniqueEntityId(input.buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const renameResult = building.rename(input.name);
    if (renameResult.isFailure) {
      const code = building.isDeleted
        ? BuildingErrorCode.ALREADY_DELETED
        : BuildingErrorCode.INVALID_NAME;
      return Result.fail(
        new BuildingApplicationError(code, renameResult.error?.message ?? 'Unable to update'),
      );
    }

    if (
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
