import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import { IFinalBoqRepository } from '@/modules/final-boq/domain/final-boq.repository';
import {
  validateComponentDistribution,
  calcTotal,
} from '@/modules/final-boq/domain/final-boq-rules';
import {
  getOrCreateFinalBoq,
  toFinalBoqItemResult,
} from '@/modules/final-boq/application/use-cases/final-boq-mappers';
import { FinalBoqItemResult } from '@/modules/final-boq/application/dto/final-boq.dto';
import {
  FinalBoqApplicationError,
  FinalBoqErrorCode,
} from '@/modules/final-boq/application/errors/final-boq-application.error';
import { ContractorBoq } from '@/modules/contractor-boq/domain/contractor-boq.entity';
import { IContractorBoqRepository } from '@/modules/contractor-boq/domain/contractor-boq.repository';
import { ContractorItemState } from '@/modules/contractor-boq/domain/contractor-boq-rules';
import { FinalItemStatus } from '@/modules/final-boq/domain/final-boq-rules';

export interface DistributeComponentInput {
  buildingId: string;
  itemCode: string;
  componentId: string;
  distribution: { contractorId: string; quantity: number }[];
}

/**
 * Mirrors distributeComponent in frontend/lib/boqStore.ts:
 * - validate sum === component.quantity and qty > 0
 * - upsert contractor BOQ items (add or accumulate assignedQuantity)
 * - derive item status / remaining from allocations (syncFinalItemState)
 */
export class DistributeComponentUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly contractorBoq: IContractorBoqRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(input: DistributeComponentInput): Promise<Result<FinalBoqItemResult>> {
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
        new FinalBoqApplicationError(FinalBoqErrorCode.ITEM_NOT_FOUND, 'البند غير موجود'),
      );
    }

    const component = item.findComponent(new UniqueEntityId(input.componentId));
    if (!component) {
      return Result.fail(
        new FinalBoqApplicationError(FinalBoqErrorCode.COMPONENT_NOT_FOUND, 'المكون غير موجود'),
      );
    }

    const validation = validateComponentDistribution(component.quantity, input.distribution);
    if (!validation.ok) {
      return Result.fail(
        new FinalBoqApplicationError(FinalBoqErrorCode.INVALID_DISTRIBUTION, validation.error),
      );
    }

    for (const d of input.distribution) {
      const contractorId = new UniqueEntityId(d.contractorId);
      let boq = await this.contractorBoq.findByBuildingAndSubcontractor(buildingId, contractorId);
      if (!boq) {
        boq = ContractorBoq.create({ buildingId, subcontractorId: contractorId });
      }

      const existingStates = boq.toItemStates();
      const existingItem = existingStates.find(
        (i) => i.itemCode === input.itemCode && i.componentId === input.componentId,
      );

      const newItem: ContractorItemState = {
        itemCode: input.itemCode,
        description: `${component.name} (${item.description})`,
        unit: component.unit,
        quantity: d.quantity,
        assignedQuantity: d.quantity,
        unitPrice: component.unitPrice,
        totalValue: calcTotal(d.quantity, component.unitPrice),
        componentId: input.componentId,
        finalItemId: input.itemCode,
      };

      let next: ContractorItemState[];
      if (existingItem) {
        next = existingStates.map((i) =>
          i.itemCode === input.itemCode && i.componentId === input.componentId
            ? {
                ...i,
                assignedQuantity: i.assignedQuantity + d.quantity,
                quantity: i.assignedQuantity + d.quantity,
                totalValue: calcTotal(i.assignedQuantity + d.quantity, component.unitPrice),
              }
            : i,
        );
      } else {
        next = [...existingStates, newItem];
      }

      boq.replaceItemsFromState(next);
      await this.contractorBoq.save(boq);
    }

    const allocations = await this.contractorBoq.getAllocationsForBuilding(buildingId);
    const derived = toFinalBoqItemResult(item, allocations);
    item.setState({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalValue: item.totalValue,
      itemStatus: derived.status as FinalItemStatus,
      isAnalyzed: derived.isAnalyzed,
    });
    await this.finalBoq.save(aggregate);

    return Result.ok(toFinalBoqItemResult(item, allocations));
  }
}
