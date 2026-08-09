import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { SubcontractorStatement } from './subcontractor-statement.entity';

export const SUBCONTRACTOR_STATEMENT_REPOSITORY = Symbol('SUBCONTRACTOR_STATEMENT_REPOSITORY');

export interface ISubcontractorStatementRepository {
  save(statement: SubcontractorStatement): Promise<void>;
  findById(id: UniqueEntityId): Promise<SubcontractorStatement | null>;
  findAll(): Promise<SubcontractorStatement[]>;
}
