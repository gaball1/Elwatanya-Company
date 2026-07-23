import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ContractorBoq } from '../domain/contractor-boq.entity';
import { ContractorBoqItem } from '../domain/contractor-boq-item.entity';
import { IContractorBoqRepository } from '../domain/contractor-boq.repository';
import { AllocationRef } from '@/modules/final-boq/domain/final-boq-rules';

@Injectable()
export class PrismaContractorBoqRepository implements IContractorBoqRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(contractorBoq: ContractorBoq): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.contractorBoq.upsert({
        where: { id: contractorBoq.id.toValue() },
        create: {
          id: contractorBoq.id.toValue(),
          buildingId: contractorBoq.buildingId.toValue(),
          subcontractorId: contractorBoq.subcontractorId.toValue(),
          workType: contractorBoq.workType,
          status: contractorBoq.status,
          version: contractorBoq.version,
          createdAt: contractorBoq.createdAt,
          updatedAt: new Date(),
          deletedAt: contractorBoq.deletedAt,
        },
        update: {
          workType: contractorBoq.workType,
          status: contractorBoq.status,
          version: contractorBoq.version,
          updatedAt: new Date(),
          deletedAt: contractorBoq.deletedAt,
        },
      });

      for (const item of contractorBoq.allItems) {
        if (item.deletedAt) {
          await tx.contractorBoqItem.updateMany({
            where: { id: item.id.toValue() },
            data: { deletedAt: item.deletedAt, updatedAt: new Date() },
          });
          continue;
        }

        await tx.contractorBoqItem.upsert({
          where: { id: item.id.toValue() },
          create: {
            id: item.id.toValue(),
            contractorBoqId: contractorBoq.id.toValue(),
            itemCode: item.itemCode,
            description: item.description,
            unit: item.unit,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            quantity: new Prisma.Decimal(item.quantity),
            assignedQuantity: new Prisma.Decimal(item.assignedQuantity),
            totalValue: new Prisma.Decimal(item.totalValue),
            finalItemId: item.finalItemId,
            componentId: item.componentId?.toValue() ?? null,
            createdAt: item.createdAt,
            updatedAt: new Date(),
            deletedAt: null,
          },
          update: {
            description: item.description,
            unit: item.unit,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            quantity: new Prisma.Decimal(item.quantity),
            assignedQuantity: new Prisma.Decimal(item.assignedQuantity),
            totalValue: new Prisma.Decimal(item.totalValue),
            finalItemId: item.finalItemId,
            componentId: item.componentId?.toValue() ?? null,
            updatedAt: new Date(),
            deletedAt: null,
          },
        });
      }
    });
  }

  async findByBuildingAndSubcontractor(
    buildingId: UniqueEntityId,
    subcontractorId: UniqueEntityId,
  ): Promise<ContractorBoq | null> {
    const record = await this.prisma.contractorBoq.findFirst({
      where: {
        buildingId: buildingId.toValue(),
        subcontractorId: subcontractorId.toValue(),
        deletedAt: null,
      },
      include: {
        items: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByBuildingId(buildingId: UniqueEntityId): Promise<ContractorBoq[]> {
    const records = await this.prisma.contractorBoq.findMany({
      where: { buildingId: buildingId.toValue(), deletedAt: null },
      include: {
        items: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      },
    });
    return records.map((r) => this.toDomain(r));
  }

  async getAllocationsForBuilding(buildingId: UniqueEntityId): Promise<AllocationRef[]> {
    const records = await this.prisma.contractorBoq.findMany({
      where: { buildingId: buildingId.toValue(), deletedAt: null },
      include: {
        subcontractor: true,
        items: { where: { deletedAt: null } },
      },
    });

    const allocations: AllocationRef[] = [];
    for (const boq of records) {
      for (const item of boq.items) {
        allocations.push({
          contractorId: boq.subcontractorId,
          contractorName: boq.subcontractor.name,
          itemCode: item.itemCode,
          componentId: item.componentId,
          assignedQuantity: item.assignedQuantity.toNumber(),
        });
      }
    }
    return allocations;
  }

  private toDomain(record: {
    id: string;
    buildingId: string;
    subcontractorId: string;
    workType: string | null;
    status: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    items: {
      id: string;
      contractorBoqId: string;
      itemCode: string;
      description: string;
      unit: string;
      unitPrice: Prisma.Decimal;
      quantity: Prisma.Decimal;
      assignedQuantity: Prisma.Decimal;
      totalValue: Prisma.Decimal;
      finalItemId: string | null;
      componentId: string | null;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }[];
  }): ContractorBoq {
    const items = record.items.map((item) =>
      ContractorBoqItem.reconstitute(
        {
          contractorBoqId: new UniqueEntityId(item.contractorBoqId),
          itemCode: item.itemCode,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity.toNumber(),
          assignedQuantity: item.assignedQuantity.toNumber(),
          unitPrice: item.unitPrice.toNumber(),
          totalValue: item.totalValue.toNumber(),
          finalItemId: item.finalItemId,
          componentId: item.componentId ? new UniqueEntityId(item.componentId) : null,
          deletedAt: item.deletedAt,
        },
        new UniqueEntityId(item.id),
        item.createdAt,
        item.updatedAt,
      ),
    );

    return ContractorBoq.reconstitute(
      {
        buildingId: new UniqueEntityId(record.buildingId),
        subcontractorId: new UniqueEntityId(record.subcontractorId),
        workType: record.workType,
        status: record.status,
        version: record.version,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
      items,
    );
  }
}
