import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IDepartmentRepository } from '../../domain/department.repository';
import { UpdateDepartmentInput, DepartmentResult } from '../dto/department.dto';
import { toResult } from './list-departments.use-case';

export class UpdateDepartmentUseCase {
  constructor(private readonly departments: IDepartmentRepository) {}

  async execute(input: UpdateDepartmentInput): Promise<Result<DepartmentResult>> {
    const department = await this.departments.findById(new UniqueEntityId(input.id));
    if (!department) return Result.fail(new Error('Department not found'));

    const updateResult = department.update({
      code: input.code,
      name: input.name,
      description: input.description,
      managerId: input.managerId,
      status: input.status,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.departments.save(department);
    return Result.ok(toResult(department));
  }
}
