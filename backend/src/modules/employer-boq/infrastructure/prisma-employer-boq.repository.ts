import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { EmployerBoqItem } from '../domain/employer-boq-item.entity';
import { IEmployerBoqRepository } from '../domain/employer-boq.repository';

@Injectable()
export class PrismaEmployerBoqRepository implements IEmployerBoqRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(item: EmployerBoqItem): Promise<void> {
    await this.prisma.employerBoqItem.upsert({
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
    items: EmployerBoqItem[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.employerBoqItem.deleteMany({
        where: { buildingId: buildingId.toValue() },
      });

      if (items.length === 0) {
        return;
      }

      await tx.employerBoqItem.createMany({
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

  async findByBuildingId(buildingId: UniqueEntityId): Promise<EmployerBoqItem[]> {
    const records = await this.prisma.employerBoqItem.findMany({
      where: { buildingId: buildingId.toValue() },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  async findByBuildingIdAndItemCode(
    buildingId: UniqueEntityId,
    itemCode: string,
  ): Promise<EmployerBoqItem | null> {
    const record = await this.prisma.employerBoqItem.findUnique({
      where: {
        buildingId_itemCode: {
          buildingId: buildingId.toValue(),
          itemCode,
        },
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByBuildingIdDescriptionAndUnit(
    buildingId: UniqueEntityId,
    description: string,
    unit: string,
  ): Promise<EmployerBoqItem | null> {
    const record = await this.prisma.employerBoqItem.findFirst({
      where: {
        buildingId: buildingId.toValue(),
        description: { equals: description.trim(), mode: 'insensitive' },
        unit: { equals: unit.trim(), mode: 'insensitive' },
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async deleteByItemCode(buildingId: UniqueEntityId, itemCode: string): Promise<void> {
    await this.prisma.employerBoqItem.deleteMany({
      where: {
        buildingId: buildingId.toValue(),
        itemCode,
      },
    });
  }

  async generateNextItemCode(buildingId: UniqueEntityId): Promise<string> {
    return await this.prisma.$transaction(async (tx) => {
      // Insert-or-increment atomically to avoid races when no counter row exists yet.
      const updated = await tx.boqCodeCounter.upsert({
        where: { buildingId: buildingId.toValue() },
        create: { buildingId: buildingId.toValue(), nextSequence: 2 },
        update: { nextSequence: { increment: 1 } },
      });
      const seq = updated.nextSequence - 1;
      return `EMP-${String(seq).padStart(3, '0')}`;
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
  }): EmployerBoqItem {
    return EmployerBoqItem.reconstitute(
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
