import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Role } from './role.entity';

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export interface IRoleRepository {
  save(role: Role): Promise<void>;
  findById(id: UniqueEntityId): Promise<Role | null>;
  findAll(): Promise<Role[]>;
}
