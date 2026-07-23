import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '../../domain/building.repository';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '../errors/building-application.error';

export class SoftDeleteBuildingUseCase {
  constructor(private readonly buildings: IBuildingRepository) {}

  async execute(buildingId: string): Promise<Result<void>> {
    const building = await this.buildings.findById(new UniqueEntityId(buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const deleteResult = building.softDelete();
    if (deleteResult.isFailure) {
      return Result.fail(
        new BuildingApplicationError(
          BuildingErrorCode.ALREADY_DELETED,
          deleteResult.error?.message ?? 'Building is already deleted',
        ),
      );
    }

    await this.buildings.save(building);
    return Result.ok();
  }
}
