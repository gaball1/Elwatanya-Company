import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IDepartmentRepository } from '../../domain/department.repository';

export class DeleteDepartmentUseCase {
  constructor(private readonly departments: IDepartmentRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const department = await this.departments.findById(new UniqueEntityId(id));
    if (!department) return Result.fail(new Error('Department not found'));

    const deleteResult = department.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.departments.save(department);
    return Result.ok();
  }
}
