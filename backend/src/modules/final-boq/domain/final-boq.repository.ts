import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { FinalBoq } from './final-boq.entity';
import { AllocationRef } from './final-boq-rules';

export const FINAL_BOQ_REPOSITORY = Symbol('FINAL_BOQ_REPOSITORY');

/**
 * Port for reading contractor allocations used by syncFinalItemState /
 * syncFinalFromAnalytical. Implemented by Contractor BOQ infrastructure.
 * Until Contractor BOQ is wired, a null-allocation adapter may be used.
 */
export const FINAL_BOQ_ALLOCATION_READER = Symbol('FINAL_BOQ_ALLOCATION_READER');

export interface IFinalBoqAllocationReader {
  getAllocationsForBuilding(buildingId: UniqueEntityId): Promise<AllocationRef[]>;
}

export interface IFinalBoqRepository {
  save(finalBoq: FinalBoq): Promise<void>;
  findByBuildingId(buildingId: UniqueEntityId): Promise<FinalBoq | null>;
  findById(id: UniqueEntityId): Promise<FinalBoq | null>;
}
