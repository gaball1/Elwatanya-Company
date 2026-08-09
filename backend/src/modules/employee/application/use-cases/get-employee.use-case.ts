import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Result } from '@/shared/kernel/result';
import { EmployeeResult } from '../dto/employee.dto';
import { toResult } from './list-employees.use-case';

export class GetEmployeeUseCase {
  constructor(private readonly employees: import('../../domain/employee.repository').IEmployeeRepository) {}

  async execute(id: string): Promise<Result<EmployeeResult | null>> {
    const employee = await this.employees.findById(new UniqueEntityId(id));
    return Result.ok(employee ? toResult(employee) : null);
  }
}
