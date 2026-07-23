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
import { applyFinalItemQuantityUpdate } from '../../domain/final-boq-rules';
import { FinalBoqComponent } from '../../domain/final-boq-component.entity';
import {
  FinalBoqApplicationError,
  FinalBoqErrorCode,
} from '../errors/final-boq-application.error';
import { UpdateFinalItemQuantityInput, FinalBoqItemResult } from '../dto/final-boq.dto';
import {
  getOrCreateFinalBoq,
  toFinalBoqItemResult,
  toItemStateInput,
} from './final-boq-mappers';

/** Mirrors updateFinalItemQuantity */
export class UpdateFinalItemQuantityUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly allocations: IFinalBoqAllocationReader,
  ) {}

  async execute(input: UpdateFinalItemQuantityInput): Promise<Result<FinalBoqItemResult>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const aggregate = await getOrCreateFinalBoq(building, this.finalBoq);
    const item = aggregate.findItemByCode(input.itemCode);
    if (!item) {
      return Result.fail(
        new FinalBoqApplicationError(FinalBoqErrorCode.ITEM_NOT_FOUND, 'Final BOQ item not found'),
      );
    }

    const allocationRefs = await this.allocations.getAllocationsForBuilding(buildingId);
    const updated = applyFinalItemQuantityUpdate(
      toItemStateInput(item),
      input.quantity,
      allocationRefs,
      input.unitPrice,
    );

    if (!updated) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.QUANTITY_BELOW_ALLOCATED,
          'New quantity is less than allocated quantity',
        ),
      );
    }

    item.setState({
      description: updated.description,
      unit: updated.unit,
      quantity: updated.quantity,
      unitPrice: updated.unitPrice,
      totalValue: updated.totalValue,
      itemStatus: updated.status,
      isAnalyzed: updated.isAnalyzed,
    });

    for (const comp of item.components) {
      const scaled = updated.components.find((c) => c.id === comp.id.toValue());
      if (scaled) {
        comp.applyScaledQuantity(scaled.quantity);
      }
    }

    // Keep TypeScript happy if components were recreated with same ids in rule output
    void FinalBoqComponent;

    await this.finalBoq.save(aggregate);
    return Result.ok(toFinalBoqItemResult(item, allocationRefs));
  }
}
