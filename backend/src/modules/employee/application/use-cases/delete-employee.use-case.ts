import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IEmployeeRepository } from '../../domain/employee.repository';

export class DeleteEmployeeUseCase {
  constructor(private readonly employees: IEmployeeRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const employee = await this.employees.findById(new UniqueEntityId(id));
    if (!employee) return Result.fail(new Error('Employee not found'));

    const deleteResult = employee.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.employees.save(employee);
    return Result.ok();
  }
}
