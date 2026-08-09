import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Employee } from './employee.entity';

export const EMPLOYEE_REPOSITORY = Symbol('EMPLOYEE_REPOSITORY');

export interface IEmployeeRepository {
  save(employee: Employee): Promise<void>;
  findById(id: UniqueEntityId): Promise<Employee | null>;
  findAll(): Promise<Employee[]>;
}
