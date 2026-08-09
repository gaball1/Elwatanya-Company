import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Employee } from '../domain/employee.entity';
import { IEmployeeRepository } from '../domain/employee.repository';

@Injectable()
export class PrismaEmployeeRepository implements IEmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(employee: Employee): Promise<void> {
    const data = {
      code: employee.code,
      fullName: employee.fullName,
      nationalId: employee.nationalId,
      phone: employee.phone,
      email: employee.email,
      address: employee.address,
      birthDate: employee.birthDate,
      hireDate: employee.hireDate,
      departmentId: employee.departmentId || null,
      roleId: employee.roleId || null,
      salary: employee.salary,
      status: employee.status,
      notes: employee.notes,
      deletedAt: employee.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.employee.upsert({
      where: { id: employee.id.toValue() },
      create: {
        id: employee.id.toValue(),
        ...data,
        createdAt: employee.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Employee | null> {
    const record = await this.prisma.employee.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Employee[]> {
    const records = await this.prisma.employee.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    code: string;
    fullName: string;
    nationalId: string;
    phone: string;
    email: string;
    address: string;
    birthDate: Date | null;
    hireDate: Date | null;
    departmentId: string | null;
    roleId: string | null;
    salary: import('decimal.js').Decimal;
    status: string;
    notes: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Employee {
    return Employee.reconstitute(
      {
        code: record.code,
        fullName: record.fullName,
        nationalId: record.nationalId,
        phone: record.phone,
        email: record.email,
        address: record.address,
        birthDate: record.birthDate,
        hireDate: record.hireDate,
        departmentId: record.departmentId ?? '',
        roleId: record.roleId ?? '',
        salary: Number(record.salary),
        status: record.status,
        notes: record.notes,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
