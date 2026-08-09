import { Result } from '@/shared/kernel/result';
import { Department } from '../../domain/department.entity';
import { DepartmentResult } from '../dto/department.dto';

export function toResult(d: Department): DepartmentResult {
  return {
    id: d.id.toValue(),
    code: d.code,
    name: d.name,
    description: d.description,
    managerId: d.managerId,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export class ListDepartmentsUseCase {
  constructor(private readonly departments: import('../../domain/department.repository').IDepartmentRepository) {}

  async execute(): Promise<Result<DepartmentResult[]>> {
    const list = await this.departments.findAll();
    return Result.ok(list.map(toResult));
  }
}
