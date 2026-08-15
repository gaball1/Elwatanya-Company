import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Result } from '@/shared/kernel/result';
import { EmployeeResult } from '../dto/employee.dto';
import { toResult } from './list-employees.use-case';
import { IEmployeeRepository } from '../../domain/employee.repository';

@Injectable()
export class GetCurrentEmployeeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employees: IEmployeeRepository,
  ) {}

  /**
   * Returns the employee linked to the given user account, or null when the
   * account is not linked to any employee record.
   */
  async execute(userId: string): Promise<Result<EmployeeResult | null>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { employeeId: true },
    });

    if (!user?.employeeId) {
      return Result.ok(null);
    }

    const employee = await this.employees.findById(new UniqueEntityId(user.employeeId));
    return Result.ok(employee ? toResult(employee) : null);
  }
}
