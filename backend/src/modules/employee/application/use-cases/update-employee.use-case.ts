import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IEmployeeRepository } from '../../domain/employee.repository';
import { UpdateEmployeeInput, EmployeeResult } from '../dto/employee.dto';
import { toResult } from './list-employees.use-case';

export class UpdateEmployeeUseCase {
  constructor(private readonly employees: IEmployeeRepository) {}

  async execute(input: UpdateEmployeeInput): Promise<Result<EmployeeResult>> {
    const employee = await this.employees.findById(new UniqueEntityId(input.id));
    if (!employee) return Result.fail(new Error('Employee not found'));

    const updateResult = employee.update({
      code: input.code,
      fullName: input.fullName,
      nationalId: input.nationalId,
      phone: input.phone,
      email: input.email,
      address: input.address,
      birthDate: input.birthDate,
      hireDate: input.hireDate,
      departmentId: input.departmentId,
      roleId: input.roleId,
      salary: input.salary,
      status: input.status,
      notes: input.notes,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.employees.save(employee);
    return Result.ok(toResult(employee));
  }
}
