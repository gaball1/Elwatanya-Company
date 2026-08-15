import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { SubcontractorContract } from './subcontractor-contract.entity';

export const SUBCONTRACTOR_CONTRACT_REPOSITORY = Symbol('SUBCONTRACTOR_CONTRACT_REPOSITORY');

export interface ISubcontractorContractRepository {
  save(contract: SubcontractorContract): Promise<void>;
  findById(id: UniqueEntityId): Promise<SubcontractorContract | null>;
  findByBuildingSubcontractor(
    buildingId: string,
    subcontractorId: string,
  ): Promise<SubcontractorContract[]>;
  findAll(): Promise<SubcontractorContract[]>;
  delete(id: UniqueEntityId): Promise<void>;
}
