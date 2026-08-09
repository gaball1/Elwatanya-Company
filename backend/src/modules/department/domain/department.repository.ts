import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Department } from './department.entity';

export const DEPARTMENT_REPOSITORY = Symbol('DEPARTMENT_REPOSITORY');

export interface IDepartmentRepository {
  save(department: Department): Promise<void>;
  findById(id: UniqueEntityId): Promise<Department | null>;
  findAll(): Promise<Department[]>;
}
