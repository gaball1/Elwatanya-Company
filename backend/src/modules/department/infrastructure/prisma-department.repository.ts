import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Department } from '../domain/department.entity';
import { IDepartmentRepository } from '../domain/department.repository';

@Injectable()
export class PrismaDepartmentRepository implements IDepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(department: Department): Promise<void> {
    const data = {
      code: department.code,
      name: department.name,
      description: department.description,
      managerId: department.managerId,
      status: department.status,
      deletedAt: department.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.department.upsert({
      where: { id: department.id.toValue() },
      create: {
        id: department.id.toValue(),
        ...data,
        createdAt: department.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Department | null> {
    const record = await this.prisma.department.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Department[]> {
    const records = await this.prisma.department.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    code: string;
    name: string;
    description: string;
    managerId: string | null;
    status: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Department {
    return Department.reconstitute(
      {
        code: record.code,
        name: record.name,
        description: record.description,
        managerId: record.managerId ?? '',
        status: record.status,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
