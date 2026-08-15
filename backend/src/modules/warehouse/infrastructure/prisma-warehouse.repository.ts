import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Warehouse } from '../domain/warehouse.entity';
import { IWarehouseRepository } from '../domain/warehouse.repository';

@Injectable()
export class PrismaWarehouseRepository implements IWarehouseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(warehouse: Warehouse): Promise<void> {
    const data = {
      projectId: warehouse.projectId,
      code: warehouse.code,
      name: warehouse.name,
      location: warehouse.location,
      status: warehouse.status,
      deletedAt: warehouse.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.warehouse.upsert({
      where: { id: warehouse.id.toValue() },
      create: {
        id: warehouse.id.toValue(),
        ...data,
        createdAt: warehouse.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Warehouse | null> {
    const record = await this.prisma.warehouse.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByCodeIncludingDeleted(code: string): Promise<Warehouse | null> {
    const record = await this.prisma.warehouse.findFirst({
      where: { code },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByNameIncludingDeleted(name: string): Promise<Warehouse | null> {
    const record = await this.prisma.warehouse.findFirst({
      where: { name },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(projectId?: string): Promise<Warehouse[]> {
    const whereClause: any = { deletedAt: null };
    if (projectId !== undefined) {
      // Return warehouses for this project AND company-wide warehouses (projectId = null)
      whereClause.OR = [
        { projectId },
        { projectId: null },
      ];
    } else {
      whereClause.projectId = null; // by default return company warehouses
    }

    const records = await this.prisma.warehouse.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    projectId: string | null;
    code: string;
    name: string;
    location: string;
    status: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Warehouse {
    return Warehouse.reconstitute(
      {
        projectId: record.projectId,
        code: record.code,
        name: record.name,
        location: record.location,
        status: record.status,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
