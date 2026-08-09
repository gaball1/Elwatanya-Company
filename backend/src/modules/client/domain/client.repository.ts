import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Client } from './client.entity';

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

export interface IClientRepository {
  save(client: Client): Promise<void>;
  findById(id: UniqueEntityId): Promise<Client | null>;
  findAll(): Promise<Client[]>;
}
