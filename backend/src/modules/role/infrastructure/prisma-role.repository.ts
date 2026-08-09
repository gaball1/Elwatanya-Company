import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Role } from '../domain/role.entity';
import { IRoleRepository } from '../domain/role.repository';

@Injectable()
export class PrismaRoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(role: Role): Promise<void> {
    const data = {
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      status: role.status,
      deletedAt: role.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.employeeRole.upsert({
      where: { id: role.id.toValue() },
      create: { id: role.id.toValue(), ...data, createdAt: role.createdAt },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Role | null> {
    const record = await this.prisma.employeeRole.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Role[]> {
    const records = await this.prisma.employeeRole.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: { id: string; name: string; description: string; permissions: string[]; status: string; deletedAt: Date | null; createdAt: Date; updatedAt: Date }): Role {
    return Role.reconstitute(
      { name: record.name, description: record.description, permissions: record.permissions, status: record.status, deletedAt: record.deletedAt },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
