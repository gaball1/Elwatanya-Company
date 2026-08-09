import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Supplier } from './supplier.entity';

export const SUPPLIER_REPOSITORY = Symbol('SUPPLIER_REPOSITORY');

export interface ISupplierRepository {
  save(supplier: Supplier): Promise<void>;
  findById(id: UniqueEntityId): Promise<Supplier | null>;
  findAll(): Promise<Supplier[]>;
}
