import { Result } from '@/shared/kernel/result';
import { Employee } from '../../domain/employee.entity';
import { EmployeeResult } from '../dto/employee.dto';

export function toResult(c: Employee): EmployeeResult {
  return {
    id: c.id.toValue(),
    code: c.code,
    fullName: c.fullName,
    nationalId: c.nationalId,
    phone: c.phone,
    email: c.email,
    address: c.address,
    birthDate: c.birthDate,
    hireDate: c.hireDate,
    departmentId: c.departmentId,
    roleId: c.roleId,
    salary: c.salary,
    status: c.status,
    notes: c.notes,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export class ListEmployeesUseCase {
  constructor(private readonly employees: import('../../domain/employee.repository').IEmployeeRepository) {}

  async execute(): Promise<Result<EmployeeResult[]>> {
    const list = await this.employees.findAll();
    return Result.ok(list.map(toResult));
  }
}
