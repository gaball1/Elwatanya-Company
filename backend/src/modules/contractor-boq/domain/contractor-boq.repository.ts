import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ContractorBoq } from './contractor-boq.entity';
import { AllocationRef } from '@/modules/final-boq/domain/final-boq-rules';

export const CONTRACTOR_BOQ_REPOSITORY = Symbol('CONTRACTOR_BOQ_REPOSITORY');

export interface IContractorBoqRepository {
  save(contractorBoq: ContractorBoq, tx?: any): Promise<void>;
  findByBuildingAndSubcontractor(
    buildingId: UniqueEntityId,
    subcontractorId: UniqueEntityId,
  ): Promise<ContractorBoq | null>;
  findByBuildingId(buildingId: UniqueEntityId): Promise<ContractorBoq[]>;
  getAllocationsForBuilding(buildingId: UniqueEntityId): Promise<AllocationRef[]>;
}
