import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '../../domain/building.repository';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '../errors/building-application.error';

export class SoftDeleteBuildingUseCase {
  constructor(
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(buildingId: string, user?: OwnershipActor): Promise<Result<void>> {
    await this.ownership.verifyBuildingAccess(user, buildingId);
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
