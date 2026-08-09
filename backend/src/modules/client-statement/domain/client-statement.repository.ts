import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ClientStatement } from './client-statement.entity';

export const CLIENT_STATEMENT_REPOSITORY = Symbol('CLIENT_STATEMENT_REPOSITORY');

export interface IClientStatementRepository {
  save(statement: ClientStatement): Promise<void>;
  findById(id: UniqueEntityId): Promise<ClientStatement | null>;
  findAll(): Promise<ClientStatement[]>;
}
