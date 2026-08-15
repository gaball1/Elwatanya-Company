import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { StockMovement, StockMovementType } from '../domain/stock-movement.entity';
import { IStockMovementRepository } from '../domain/stock-movement.repository';

@Injectable()
export class PrismaStockMovementRepository implements IStockMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(stockMovement: StockMovement): Promise<void> {
    const data = {
      itemId: stockMovement.itemId,
      type: stockMovement.type,
      quantity: stockMovement.quantity,
      date: stockMovement.date,
      reference: stockMovement.reference,
      reason: stockMovement.reason,
      notes: stockMovement.notes,
      createdBy: stockMovement.createdBy,
      issuedTo: stockMovement.issuedTo,
      supplier: stockMovement.supplier,
      fromWarehouse: stockMovement.fromWarehouse,
      toWarehouse: stockMovement.toWarehouse,
      deletedAt: stockMovement.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.stockMovement.upsert({
      where: { id: stockMovement.id.toValue() },
      create: {
        id: stockMovement.id.toValue(),
        ...data,
        createdAt: stockMovement.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<StockMovement | null> {
    const record = await this.prisma.stockMovement.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<StockMovement[]> {
    const records = await this.prisma.stockMovement.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    itemId: string;
    type: string;
    quantity: import('decimal.js').Decimal;
    date: Date;
    reference: string;
    reason: string;
    notes: string;
    createdBy: string;
    issuedTo: string;
    supplier: string;
    fromWarehouse: string;
    toWarehouse: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): StockMovement {
    return StockMovement.reconstitute(
      {
        itemId: record.itemId,
        type: record.type as StockMovementType,
        quantity: Number(record.quantity),
        date: record.date,
        reference: record.reference,
        reason: record.reason,
        notes: record.notes,
        createdBy: record.createdBy,
        issuedTo: record.issuedTo,
        supplier: record.supplier,
        fromWarehouse: record.fromWarehouse,
        toWarehouse: record.toWarehouse,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
