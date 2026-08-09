import { Result } from '@/shared/kernel/result';
import { IEmployeeRepository } from '../../domain/employee.repository';
import { CreateEmployeeInput, EmployeeResult } from '../dto/employee.dto';
import { Employee } from '../../domain/employee.entity';
import { toResult } from './list-employees.use-case';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { EmployeeCreatedEvent } from '@/modules/domain-events/events';

export class CreateEmployeeUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(input: CreateEmployeeInput): Promise<Result<EmployeeResult>> {
    const result = Employee.create({
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

    if (result.isFailure) return Result.fail(result.error as Error);

    const employee = result.getValue();
    await this.employees.save(employee);

    await this.eventBus.publish(
      new EmployeeCreatedEvent(
        employee.id.toValue(),
        'employee',
        {
          id: employee.id.toValue(),
          name: employee.fullName,
          role: employee.roleId ?? 'EMPLOYEE',
          department: employee.departmentId ?? '',
          createdBy: undefined,
          roles: ['CEO', 'TECHNICAL_OFFICE', 'HR', 'EMPLOYEE'],
        },
      ),
    );

    return Result.ok(toResult(employee));
  }
}
