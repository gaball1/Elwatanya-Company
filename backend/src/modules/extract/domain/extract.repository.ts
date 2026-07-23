import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Extract } from './extract.entity';

export const EXTRACT_REPOSITORY = Symbol('EXTRACT_REPOSITORY');

export interface IExtractRepository {
  save(extract: Extract): Promise<void>;
  findById(id: UniqueEntityId): Promise<Extract | null>;
  findByContractorBoqId(contractorBoqId: UniqueEntityId): Promise<Extract[]>;
  delete(id: UniqueEntityId): Promise<void>;
}
