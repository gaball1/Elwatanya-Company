import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import { IEmployerBoqRepository } from '@/modules/employer-boq/domain/employer-boq.repository';
import { FinalBoqItem } from '../../domain/final-boq-item.entity';
import {
  IFinalBoqAllocationReader,
  IFinalBoqRepository,
} from '../../domain/final-boq.repository';
import { ImportFinalFromEmployerInput, FinalBoqItemResult } from '../dto/final-boq.dto';
import {
  FinalBoqApplicationError,
  FinalBoqErrorCode,
} from '../errors/final-boq-application.error';
import { getOrCreateFinalBoq, toFinalBoqItemResult } from './final-boq-mappers';

/** Mirrors importFinalFromEmployer */
export class ImportFinalFromEmployerUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly employerBoq: IEmployerBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly allocations: IFinalBoqAllocationReader,
  ) {}

  async execute(input: ImportFinalFromEmployerInput): Promise<Result<FinalBoqItemResult | null>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const src = await this.employerBoq.findByBuildingIdAndItemCode(buildingId, input.itemCode);
    if (!src) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.EMPLOYER_ITEM_NOT_FOUND,
          'Employer BOQ item not found',
        ),
      );
    }

    const aggregate = await getOrCreateFinalBoq(building, this.finalBoq);
    const allocationRefs = await this.allocations.getAllocationsForBuilding(buildingId);

    const existing = aggregate.findItemByCode(input.itemCode);
    if (existing) {
      // Frontend: recalcFinalRemaining then return existing
      return Result.ok(toFinalBoqItemResult(existing, allocationRefs));
    }

    const item = FinalBoqItem.fromSourceItem({
      finalBoqId: aggregate.id,
      itemCode: src.itemCode,
      description: src.description,
      unit: src.unit,
      quantity: src.quantity,
      unitPrice: src.unitPrice,
      totalValue: src.totalValue,
      sortOrder: aggregate.items.length,
    });
    aggregate.addItem(item);
    await this.finalBoq.save(aggregate);

    return Result.ok(toFinalBoqItemResult(item, allocationRefs));
  }
}
