import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { FinalBoq } from '../domain/final-boq.entity';
import { FinalBoqItem } from '../domain/final-boq-item.entity';
import { FinalBoqComponent } from '../domain/final-boq-component.entity';
import { IFinalBoqRepository } from '../domain/final-boq.repository';
import { FinalItemStatus } from '../domain/final-boq-rules';

type ComponentRecord = {
  id: string;
  finalBoqItemId: string;
  businessCode: string;
  description: string;
  unit: string;
  unitPrice: Prisma.Decimal;
  quantity: Prisma.Decimal;
  totalValue: Prisma.Decimal;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type ItemRecord = {
  id: string;
  finalBoqId: string;
  businessCode: string;
  description: string;
  unit: string;
  unitPrice: Prisma.Decimal;
  quantity: Prisma.Decimal;
  totalValue: Prisma.Decimal;
  itemStatus: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  components: ComponentRecord[];
};

type FinalBoqRecord = {
  id: string;
  buildingId: string;
  projectId: string;
  businessCode: string;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  items: ItemRecord[];
};

@Injectable()
export class PrismaFinalBoqRepository implements IFinalBoqRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(finalBoq: FinalBoq): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.finalBoq.upsert({
        where: {
          projectId_businessCode: {
            projectId: finalBoq.projectId.toValue(),
            businessCode: finalBoq.businessCode,
          },
        },
        create: {
          id: finalBoq.id.toValue(),
          buildingId: finalBoq.buildingId.toValue(),
          projectId: finalBoq.projectId.toValue(),
          businessCode: finalBoq.businessCode,
          status: finalBoq.status,
          version: finalBoq.version,
          createdAt: finalBoq.createdAt,
          updatedAt: new Date(),
          deletedAt: finalBoq.deletedAt,
        },
        update: {
          status: finalBoq.status,
          version: finalBoq.version,
          updatedAt: new Date(),
          deletedAt: finalBoq.deletedAt,
        },
      });

      for (const item of finalBoq.allItems) {
        if (item.deletedAt) {
          await tx.finalBoqItem.updateMany({
            where: { id: item.id.toValue() },
            data: { deletedAt: item.deletedAt, updatedAt: new Date() },
          });
          await tx.component.updateMany({
            where: { finalBoqItemId: item.id.toValue(), deletedAt: null },
            data: { deletedAt: item.deletedAt, updatedAt: new Date() },
          });
          continue;
        }

        await tx.finalBoqItem.upsert({
          where: {
            finalBoqId_businessCode: {
              finalBoqId: finalBoq.id.toValue(),
              businessCode: item.businessCode,
            },
          },
          create: {
            id: item.id.toValue(),
            finalBoqId: finalBoq.id.toValue(),
            businessCode: item.businessCode,
            description: item.description,
            unit: item.unit,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            quantity: new Prisma.Decimal(item.quantity),
            totalValue: new Prisma.Decimal(item.totalValue),
            itemStatus: item.itemStatus,
            sortOrder: item.sortOrder,
            createdAt: item.createdAt,
            updatedAt: new Date(),
            deletedAt: null,
          },
          update: {
            description: item.description,
            unit: item.unit,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            quantity: new Prisma.Decimal(item.quantity),
            totalValue: new Prisma.Decimal(item.totalValue),
            itemStatus: item.itemStatus,
            sortOrder: item.sortOrder,
            updatedAt: new Date(),
            deletedAt: null,
          },
        });

        for (const component of item.allComponents) {
          if (component.deletedAt) {
            await tx.component.updateMany({
              where: { id: component.id.toValue() },
              data: { deletedAt: component.deletedAt, updatedAt: new Date() },
            });
            continue;
          }

          await tx.component.upsert({
            where: {
              finalBoqItemId_businessCode: {
                finalBoqItemId: item.id.toValue(),
                businessCode: component.businessCode,
              },
            },
            create: {
              id: component.id.toValue(),
              finalBoqItemId: item.id.toValue(),
              businessCode: component.businessCode,
              description: component.name,
              unit: component.unit,
              unitPrice: new Prisma.Decimal(component.unitPrice),
              quantity: new Prisma.Decimal(component.quantity),
              totalValue: new Prisma.Decimal(component.totalValue),
              lifecycleStatus: 'pending',
              sortOrder: component.sortOrder,
              createdAt: component.createdAt,
              updatedAt: new Date(),
              deletedAt: null,
            },
            update: {
              businessCode: component.businessCode,
              description: component.name,
              unit: component.unit,
              unitPrice: new Prisma.Decimal(component.unitPrice),
              quantity: new Prisma.Decimal(component.quantity),
              totalValue: new Prisma.Decimal(component.totalValue),
              sortOrder: component.sortOrder,
              updatedAt: new Date(),
              deletedAt: null,
            },
          });
        }
      }
    });
  }

  async findByBuildingId(buildingId: UniqueEntityId): Promise<FinalBoq | null> {
    const record = await this.prisma.finalBoq.findFirst({
      where: { buildingId: buildingId.toValue(), deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            components: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    return record ? this.toDomain(record as FinalBoqRecord) : null;
  }

  async findById(id: UniqueEntityId): Promise<FinalBoq | null> {
    const record = await this.prisma.finalBoq.findFirst({
      where: { id: id.toValue(), deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            components: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    return record ? this.toDomain(record as FinalBoqRecord) : null;
  }

  private toDomain(record: FinalBoqRecord): FinalBoq {
    const items = record.items.map((item) => {
      const components = item.components.map((component) =>
        FinalBoqComponent.reconstitute(
          {
            finalBoqItemId: new UniqueEntityId(component.finalBoqItemId),
            businessCode: component.businessCode,
            name: component.description,
            unit: component.unit,
            quantity: component.quantity.toNumber(),
            unitPrice: component.unitPrice.toNumber(),
            totalValue: component.totalValue.toNumber(),
            sortOrder: component.sortOrder,
            deletedAt: component.deletedAt,
          },
          new UniqueEntityId(component.id),
          component.createdAt,
          component.updatedAt,
        ),
      );

      return FinalBoqItem.reconstitute(
        {
          finalBoqId: new UniqueEntityId(item.finalBoqId),
          businessCode: item.businessCode,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity.toNumber(),
          unitPrice: item.unitPrice.toNumber(),
          totalValue: item.totalValue.toNumber(),
          itemStatus: item.itemStatus as FinalItemStatus,
          isAnalyzed: components.length > 0,
          sortOrder: item.sortOrder,
          deletedAt: item.deletedAt,
        },
        new UniqueEntityId(item.id),
        item.createdAt,
        item.updatedAt,
        components,
      );
    });

    return FinalBoq.reconstitute(
      {
        buildingId: new UniqueEntityId(record.buildingId),
        projectId: new UniqueEntityId(record.projectId),
        businessCode: record.businessCode,
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
