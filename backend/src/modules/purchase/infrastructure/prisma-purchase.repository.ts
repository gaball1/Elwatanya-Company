import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Purchase, PurchaseStatus } from '../domain/purchase.entity';
import { IPurchaseRepository } from '../domain/purchase.repository';

@Injectable()
export class PrismaPurchaseRepository implements IPurchaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(purchase: Purchase, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    const data = {
      projectId: purchase.projectId,
      buildingId: purchase.buildingId,
      supplierId: purchase.supplierId,
      itemName: purchase.itemName,
      quantity: purchase.quantity,
      unit: purchase.unit,
      unitPrice: purchase.unitPrice,
      total: purchase.total,
      date: purchase.date,
      status: purchase.status,
      notes: purchase.notes,
      invoiceFile: purchase.invoiceFile,
      supplierName: purchase.supplierName,
      createdBy: purchase.createdBy,
      categoryId: purchase.categoryId || null,
      inventoryItemId: purchase.inventoryItemId || null,
      warehouseId: purchase.warehouseId || null,
      deletedAt: purchase.deletedAt,
      updatedAt: new Date(),
    };

    await client.purchase.upsert({
      where: { id: purchase.id.toValue() },
      create: {
        id: purchase.id.toValue(),
        ...data,
        createdAt: purchase.createdAt,
      },
      update: data,
    });
  }

  async transition(
    id: string,
    fromStatuses: PurchaseStatus[],
    toStatus: PurchaseStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx || this.prisma;
    const result = await client.purchase.updateMany({
      where: { id, deletedAt: null, status: { in: fromStatuses } },
      data: { status: toStatus, updatedAt: new Date() },
    });
    return result.count > 0;
  }

  async findById(id: UniqueEntityId, tx?: Prisma.TransactionClient): Promise<Purchase | null> {
    const client = tx || this.prisma;
    const record = await client.purchase.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByProjectId(projectId: string, tx?: Prisma.TransactionClient): Promise<Purchase[]> {
    const client = tx || this.prisma;
    const records = await client.purchase.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { date: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByProjectIds(projectIds: string[], status?: string, tx?: Prisma.TransactionClient): Promise<Purchase[]> {
    const client = tx || this.prisma;
    const records = await client.purchase.findMany({
      where: { projectId: { in: projectIds }, status: status || undefined, deletedAt: null },
      orderBy: { date: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByStatus(status: string, projectId?: string, tx?: Prisma.TransactionClient): Promise<Purchase[]> {
    const client = tx || this.prisma;
    const records = await client.purchase.findMany({
      where: { status, projectId: projectId || undefined, deletedAt: null },
      orderBy: { date: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findAll(tx?: Prisma.TransactionClient): Promise<Purchase[]> {
    const client = tx || this.prisma;
    const records = await client.purchase.findMany({
      where: { deletedAt: null },
      orderBy: { date: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    projectId: string;
    buildingId: string | null;
    supplierId: string | null;
    itemName: string;
    quantity: import('@prisma/client/runtime/library').Decimal;
    unit: string;
    unitPrice: import('@prisma/client/runtime/library').Decimal;
    total: import('@prisma/client/runtime/library').Decimal;
    date: Date;
    status: string;
    notes: string;
    invoiceFile: string | null;
    supplierName: string;
    createdBy: string;
    categoryId: string | null;
    inventoryItemId: string | null;
    warehouseId: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Purchase {
    return Purchase.reconstitute(
      {
        projectId: record.projectId,
        buildingId: record.buildingId,
        supplierId: record.supplierId,
        itemName: record.itemName,
        quantity: Number(record.quantity),
        unit: record.unit,
        unitPrice: Number(record.unitPrice),
        total: Number(record.total),
        date: record.date,
        status: record.status as PurchaseStatus,
        notes: record.notes,
        invoiceFile: record.invoiceFile,
        supplierName: record.supplierName,
        createdBy: record.createdBy,
        categoryId: record.categoryId ?? '',
        inventoryItemId: record.inventoryItemId ?? '',
        warehouseId: record.warehouseId ?? null,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
