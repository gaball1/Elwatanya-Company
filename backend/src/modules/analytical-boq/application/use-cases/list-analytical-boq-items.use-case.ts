import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { IAnalyticalBoqRepository } from '../../domain/analytical-boq.repository';
import { AnalyticalBoqItem } from '../../domain/analytical-boq-item.entity';
import { AnalyticalBoqItemResult } from '../dto/analytical-boq.dto';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class ListAnalyticalBoqItemsUseCase {
  constructor(
    private readonly analyticalBoq: IAnalyticalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(buildingId: string, user?: OwnershipActor): Promise<Result<AnalyticalBoqItemResult[]>> {
    await this.ownership.verifyBuildingAccess(user, buildingId);
    const building = await this.buildings.findById(new UniqueEntityId(buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const items = await this.analyticalBoq.findByBuildingId(new UniqueEntityId(buildingId));
    return Result.ok(items.map(toAnalyticalBoqItemResult));
  }
}

export function toAnalyticalBoqItemResult(item: AnalyticalBoqItem): AnalyticalBoqItemResult {
  return {
    itemCode: item.itemCode,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalValue: item.totalValue,
  };
}
