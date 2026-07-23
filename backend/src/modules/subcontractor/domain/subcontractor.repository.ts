import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Subcontractor } from './subcontractor.entity';

export const SUBCONTRACTOR_REPOSITORY = Symbol('SUBCONTRACTOR_REPOSITORY');

export interface ISubcontractorRepository {
  save(subcontractor: Subcontractor): Promise<void>;
  findById(id: UniqueEntityId): Promise<Subcontractor | null>;
  findAll(): Promise<Subcontractor[]>;
}
