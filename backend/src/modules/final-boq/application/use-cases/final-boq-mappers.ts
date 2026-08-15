import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { Building } from '@/modules/building/domain/building.entity';
import { FinalBoq } from '../../domain/final-boq.entity';
import { FinalBoqItem } from '../../domain/final-boq-item.entity';
import {
  IFinalBoqAllocationReader,
  IFinalBoqRepository,
} from '../../domain/final-boq.repository';
import {
  AllocationRef,
  FinalItemStateInput,
  syncFinalItemState,
} from '../../domain/final-boq-rules';
import {
  FinalBoqComponentResult,
  FinalBoqItemResult,
  FinalBoqTotalsResult,
} from '../dto/final-boq.dto';

export async function getOrCreateFinalBoq(
  building: Building,
  finalBoqRepo: IFinalBoqRepository,
): Promise<FinalBoq> {
  const existing = await finalBoqRepo.findByBuildingId(building.id);
  if (existing) {
    return existing;
  }

  const created = FinalBoq.createForBuilding({
    buildingId: building.id,
    projectId: building.projectId,
  });
  await finalBoqRepo.save(created);
  return created;
}

export function toItemStateInput(item: FinalBoqItem): FinalItemStateInput {
  return {
    itemCode: item.itemCode,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalValue: item.totalValue,
    isAnalyzed: item.isAnalyzed,
    status: item.itemStatus,
    components: item.components.map((c) => ({
      id: c.id.toValue(),
      name: c.name,
      unit: c.unit,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      totalValue: c.totalValue,
    })),
  };
}

export function toFinalBoqItemResult(
  item: FinalBoqItem,
  allocations: AllocationRef[],
): FinalBoqItemResult {
  const synced = syncFinalItemState(toItemStateInput(item), allocations);
  return {
    itemCode: synced.itemCode,
    description: synced.description,
    unit: synced.unit,
    quantity: synced.quantity,
    unitPrice: synced.unitPrice,
    totalValue: synced.totalValue,
    remainingQuantity: synced.remainingQuantity,
    isAnalyzed: synced.isAnalyzed,
    status: synced.status,
    components: synced.components.map(
      (c): FinalBoqComponentResult => ({
        id: c.id,
        name: c.name,
        unit: c.unit,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        totalValue: c.totalValue,
        isDistributed: c.isDistributed,
        remainingQuantity: c.remainingQuantity,
        distribution: c.distribution,
      }),
    ),
    itemDistribution: synced.itemDistribution,
  };
}

/** Mirrors calculateFinalTotals */
export function calculateFinalTotals(items: FinalBoqItemResult[]): FinalBoqTotalsResult {
  return items.reduce(
    (acc, item) => {
      acc.quantity += item.quantity;
      acc.remainingQuantity += item.remainingQuantity;
      acc.totalValue += item.totalValue;
      return acc;
    },
    { quantity: 0, remainingQuantity: 0, totalValue: 0 },
  );
}

export async function loadBuildingAllocations(
  buildingId: UniqueEntityId,
  buildings: IBuildingRepository,
  allocationReader: IFinalBoqAllocationReader,
): Promise<{ building: Building | null; allocations: AllocationRef[] }> {
  const building = await buildings.findById(buildingId);
  if (!building) {
    return { building: null, allocations: [] };
  }
  const allocations = await allocationReader.getAllocationsForBuilding(buildingId);
  return { building, allocations };
}
