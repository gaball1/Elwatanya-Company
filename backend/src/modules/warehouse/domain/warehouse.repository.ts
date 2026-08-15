import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Warehouse } from './warehouse.entity';
export const WAREHOUSE_REPOSITORY = Symbol('WAREHOUSE_REPOSITORY');
export interface IWarehouseRepository {
  save(warehouse: Warehouse): Promise<void>;
  findById(id: UniqueEntityId): Promise<Warehouse | null>;
  findByCodeIncludingDeleted(code: string): Promise<Warehouse | null>;
  findByNameIncludingDeleted(name: string): Promise<Warehouse | null>;
  findAll(projectId?: string): Promise<Warehouse[]>;
}
