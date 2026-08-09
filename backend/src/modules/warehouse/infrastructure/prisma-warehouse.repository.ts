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

  async findAll(): Promise<Warehouse[]> {
    const records = await this.prisma.warehouse.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
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
