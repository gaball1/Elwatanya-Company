import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '../../domain/building.repository';
import { OwnershipService } from '@/common/services/ownership.service';
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

  async execute(buildingId: string, userProjectId?: string | null): Promise<Result<BuildingResult>> {
    await this.ownership.verifyBuildingAccess(userProjectId, buildingId);
    const building = await this.buildings.findById(new UniqueEntityId(buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }
    return Result.ok(toBuildingResult(building));
  }
}
