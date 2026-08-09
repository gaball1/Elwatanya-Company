import { Result } from '@/shared/kernel/result';
import { IDepartmentRepository } from '../../domain/department.repository';
import { CreateDepartmentInput, DepartmentResult } from '../dto/department.dto';
import { Department } from '../../domain/department.entity';
import { toResult } from './list-departments.use-case';

export class CreateDepartmentUseCase {
  constructor(private readonly departments: IDepartmentRepository) {}

  async execute(input: CreateDepartmentInput): Promise<Result<DepartmentResult>> {
    const result = Department.create({
      code: input.code,
      name: input.name,
      description: input.description,
      managerId: input.managerId,
      status: input.status,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const department = result.getValue();
    await this.departments.save(department);
    return Result.ok(toResult(department));
  }
}
