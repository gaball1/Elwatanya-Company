import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { AnalyticalBoqItem } from '../domain/analytical-boq-item.entity';
import { IAnalyticalBoqRepository } from '../domain/analytical-boq.repository';

@Injectable()
export class PrismaAnalyticalBoqRepository implements IAnalyticalBoqRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(item: AnalyticalBoqItem): Promise<void> {
    await this.prisma.analyticalBoqItem.upsert({
      where: {
        buildingId_itemCode: {
          buildingId: item.buildingId.toValue(),
          itemCode: item.itemCode,
        },
      },
      create: {
        id: item.id.toValue(),
        buildingId: item.buildingId.toValue(),
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(item.unitPrice),
        totalValue: new Prisma.Decimal(item.totalValue),
        createdAt: item.createdAt,
        updatedAt: new Date(),
      },
      update: {
        description: item.description,
        unit: item.unit,
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(item.unitPrice),
        totalValue: new Prisma.Decimal(item.totalValue),
        updatedAt: new Date(),
      },
    });
  }

  async replaceAllForBuilding(
    buildingId: UniqueEntityId,
    items: AnalyticalBoqItem[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.analyticalBoqItem.deleteMany({
        where: { buildingId: buildingId.toValue() },
      });

      if (items.length === 0) {
        return;
      }

      await tx.analyticalBoqItem.createMany({
        data: items.map((item) => ({
          id: item.id.toValue(),
          buildingId: buildingId.toValue(),
          itemCode: item.itemCode,
          description: item.description,
          unit: item.unit,
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          totalValue: new Prisma.Decimal(item.totalValue),
          createdAt: item.createdAt,
          updatedAt: new Date(),
        })),
      });
    });
  }

  async findByBuildingId(buildingId: UniqueEntityId): Promise<AnalyticalBoqItem[]> {
    const records = await this.prisma.analyticalBoqItem.findMany({
      where: { buildingId: buildingId.toValue() },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  async findByBuildingIdAndItemCode(
    buildingId: UniqueEntityId,
    itemCode: string,
  ): Promise<AnalyticalBoqItem | null> {
    const record = await this.prisma.analyticalBoqItem.findUnique({
      where: {
        buildingId_itemCode: {
          buildingId: buildingId.toValue(),
          itemCode,
        },
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async deleteByItemCode(buildingId: UniqueEntityId, itemCode: string): Promise<void> {
    await this.prisma.analyticalBoqItem.delete({
      where: {
        buildingId_itemCode: {
          buildingId: buildingId.toValue(),
          itemCode,
        },
      },
    });
  }

  private toDomain(record: {
    id: string;
    buildingId: string;
    itemCode: string;
    description: string;
    unit: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    totalValue: Prisma.Decimal;
    createdAt: Date;
    updatedAt: Date;
  }): AnalyticalBoqItem {
    return AnalyticalBoqItem.reconstitute(
      {
        buildingId: new UniqueEntityId(record.buildingId),
        itemCode: record.itemCode,
        description: record.description,
        unit: record.unit,
        quantity: record.quantity.toNumber(),
        unitPrice: record.unitPrice.toNumber(),
        totalValue: record.totalValue.toNumber(),
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
