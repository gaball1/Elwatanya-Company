import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '../../domain/building.repository';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { BuildingResult } from '../dto/building.dto';
import { toBuildingResult } from './create-building.use-case';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '../errors/building-application.error';

export class GetBuildingUseCase {
  constructor(
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(buildingId: string, user?: OwnershipActor): Promise<Result<BuildingResult>> {
    await this.ownership.verifyBuildingAccess(user, buildingId);
    const building = await this.buildings.findById(new UniqueEntityId(buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }
    return Result.ok(toBuildingResult(building));
  }
}
