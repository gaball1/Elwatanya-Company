import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import {
  IFinalBoqAllocationReader,
  IFinalBoqRepository,
} from '../../domain/final-boq.repository';
import { FinalBoqItemResult, FinalBoqTotalsResult } from '../dto/final-boq.dto';
import {
  calculateFinalTotals,
  getOrCreateFinalBoq,
  toFinalBoqItemResult,
} from './final-boq-mappers';

/** Mirrors getFinalItems + calculateFinalTotals */
export class ListFinalBoqItemsUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly allocations: IFinalBoqAllocationReader,
  ) {}

  async execute(
    buildingId: string,
  ): Promise<Result<{ items: FinalBoqItemResult[]; totals: FinalBoqTotalsResult }>> {
    const building = await this.buildings.findById(new UniqueEntityId(buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const aggregate = await getOrCreateFinalBoq(building, this.finalBoq);
    const allocationRefs = await this.allocations.getAllocationsForBuilding(building.id);
    const items = aggregate.items.map((item) => toFinalBoqItemResult(item, allocationRefs));
    return Result.ok({ items, totals: calculateFinalTotals(items) });
  }
}
