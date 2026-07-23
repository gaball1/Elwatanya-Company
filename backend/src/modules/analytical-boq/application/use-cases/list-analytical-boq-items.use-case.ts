import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { IAnalyticalBoqRepository } from '../../domain/analytical-boq.repository';
import { AnalyticalBoqItem } from '../../domain/analytical-boq-item.entity';
import { AnalyticalBoqItemResult } from '../dto/analytical-boq.dto';

export class ListAnalyticalBoqItemsUseCase {
  constructor(
    private readonly analyticalBoq: IAnalyticalBoqRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(buildingId: string): Promise<Result<AnalyticalBoqItemResult[]>> {
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
