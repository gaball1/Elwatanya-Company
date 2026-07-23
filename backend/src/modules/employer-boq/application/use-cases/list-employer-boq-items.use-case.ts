import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { IEmployerBoqRepository } from '../../domain/employer-boq.repository';
import { EmployerBoqItem } from '../../domain/employer-boq-item.entity';
import { EmployerBoqItemResult } from '../dto/employer-boq.dto';

export class ListEmployerBoqItemsUseCase {
  constructor(
    private readonly employerBoq: IEmployerBoqRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(buildingId: string): Promise<Result<EmployerBoqItemResult[]>> {
    const building = await this.buildings.findById(new UniqueEntityId(buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const items = await this.employerBoq.findByBuildingId(new UniqueEntityId(buildingId));
    return Result.ok(items.map(toEmployerBoqItemResult));
  }
}

export function toEmployerBoqItemResult(item: EmployerBoqItem): EmployerBoqItemResult {
  return {
    itemCode: item.itemCode,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalValue: item.totalValue,
  };
}
