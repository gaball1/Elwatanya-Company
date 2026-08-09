import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { InventoryItem } from '../domain/inventory-item.entity';
import { IInventoryItemRepository } from '../domain/inventory-item.repository';

@Injectable()
export class PrismaInventoryItemRepository implements IInventoryItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(item: InventoryItem): Promise<void> {
    const data = {
      code: item.code,
      name: item.name,
      nameNorm: item.nameNorm,
      description: item.description,
      categoryId: item.categoryId || null,
      warehouseId: item.warehouseId || null,
      unit: item.unit,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      price: item.price,
      avgCost: item.avgCost,
      status: item.status,
      deletedAt: item.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.inventoryItem.upsert({
      where: { id: item.id.toValue() },
      create: {
        id: item.id.toValue(),
        ...data,
        createdAt: item.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<InventoryItem | null> {
    const record = await this.prisma.inventoryItem.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<InventoryItem[]> {
    const records = await this.prisma.inventoryItem.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByCode(code: string): Promise<InventoryItem | null> {
    const record = await this.prisma.inventoryItem.findFirst({
      where: { code, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByCodeIncludingDeleted(code: string): Promise<InventoryItem | null> {
    const record = await this.prisma.inventoryItem.findFirst({
      where: { code },
    });
    return record ? this.toDomain(record) : null;
  }

  async findNameConflict(nameNorm: string, categoryId: string, excludeId?: string): Promise<InventoryItem | null> {
    const record = await this.prisma.inventoryItem.findFirst({
      where: {
        nameNorm,
        ...(categoryId ? { categoryId } : { categoryId: null }),
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    return record ? this.toDomain(record) : null;
  }

  private toDomain(record: {
    id: string;
    code: string;
    name: string;
    nameNorm: string;
    description: string;
    categoryId: string | null;
    warehouseId: string | null;
    unit: string;
    quantity: unknown;
    minQuantity: unknown;
    price: unknown;
    avgCost: unknown;
    status: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): InventoryItem {
    return InventoryItem.reconstitute(
      {
        code: record.code,
        name: record.name,
        nameNorm: record.nameNorm,
        description: record.description,
        categoryId: record.categoryId ?? '',
        warehouseId: record.warehouseId ?? '',
        unit: record.unit,
        quantity: Number(record.quantity),
        minQuantity: Number(record.minQuantity),
        price: Number(record.price),
        avgCost: Number(record.avgCost),
        status: record.status,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}