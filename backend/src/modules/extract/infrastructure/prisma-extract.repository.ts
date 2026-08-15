import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Extract } from '../domain/extract.entity';
import { IExtractRepository, ExtractListItem } from '../domain/extract.repository';
import { ExtractDeduction, ExtractStatus } from '../domain/extract-rules';

function deductionTypeToPrisma(type: ExtractDeduction['type']): 'INSURANCE' | 'PREVIOUS_PAYMENTS' | 'CUSTOM' {
  if (type === 'insurance') return 'INSURANCE';
  if (type === 'previous_paid') return 'PREVIOUS_PAYMENTS';
  return 'CUSTOM';
}

function deductionTypeFromPrisma(type: string): ExtractDeduction['type'] {
  if (type === 'INSURANCE') return 'insurance';
  if (type === 'PREVIOUS_PAYMENTS') return 'previous_paid';
  return 'manual';
}

function parseOtherAmountItems(value: Prisma.JsonValue | null): { id: string; name: string; amount: number }[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { id: string; name: string; amount: number } => {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Record<string, unknown>;
    return typeof obj.id === 'string' && typeof obj.name === 'string' && typeof obj.amount === 'number';
  }).map((item) => ({
    id: item.id,
    name: item.name,
    amount: item.amount,
  }));
}

@Injectable()
export class PrismaExtractRepository implements IExtractRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(extract: Extract, tx?: any): Promise<void> {
    const run = async (client: any) => {
      await client.statement.upsert({
        where: { id: extract.id.toValue() },
        create: {
          id: extract.id.toValue(),
          contractorBoqId: extract.contractorBoqId.toValue(),
          sequenceNumber: extract.sequenceNumber,
          status: extract.status,
          runningNumber: extract.runningNumber,
          label: extract.label,
          insurancePercent: new Prisma.Decimal(extract.insurancePercent),
          extractDate: extract.extractDate,
          previousPaid: new Prisma.Decimal(extract.previousPaid),
          otherAmounts: new Prisma.Decimal(extract.otherAmounts),
          otherAmountItems: extract.otherAmountItems.length ? extract.otherAmountItems : Prisma.JsonNull,
          totalWorkValue: new Prisma.Decimal(extract.totalWorkValue),
          totalDeductions: new Prisma.Decimal(extract.totalDeductions),
          netPayable: new Prisma.Decimal(extract.netPayable),
          createdAt: extract.createdAt,
          updatedAt: new Date(),
          deletedAt: extract.deletedAt,
        },
        update: {
          status: extract.status,
          runningNumber: extract.runningNumber,
          label: extract.label,
          insurancePercent: new Prisma.Decimal(extract.insurancePercent),
          extractDate: extract.extractDate,
          previousPaid: new Prisma.Decimal(extract.previousPaid),
          otherAmounts: new Prisma.Decimal(extract.otherAmounts),
          otherAmountItems: extract.otherAmountItems.length ? extract.otherAmountItems : Prisma.JsonNull,
          totalWorkValue: new Prisma.Decimal(extract.totalWorkValue),
          totalDeductions: new Prisma.Decimal(extract.totalDeductions),
          netPayable: new Prisma.Decimal(extract.netPayable),
          updatedAt: new Date(),
          deletedAt: extract.deletedAt,
        },
      });

      await client.statementItem.deleteMany({ where: { statementId: extract.id.toValue() } });
      if (extract.items.length > 0) {
        await client.statementItem.createMany({
          data: extract.items.map((item) => ({
            statementId: extract.id.toValue(),
            contractorBoqItemId: item.contractorBoqItemId,
            itemCode: item.itemCode,
            description: item.description,
            unit: item.unit,
            contractQuantity: new Prisma.Decimal(item.contractQuantity),
            previousQuantity: new Prisma.Decimal(item.previous),
            currentQuantity: new Prisma.Decimal(item.current),
            totalQuantity: new Prisma.Decimal(item.total),
            executionPercent: new Prisma.Decimal(item.executionPercent),
            totalExecuted: new Prisma.Decimal(item.executedQuantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            currentWorkValue: new Prisma.Decimal(item.workValue),
          })),
        });
      }

      await client.statementDeduction.deleteMany({ where: { statementId: extract.id.toValue() } });
      const deductions = extract.allDeductions();
      if (deductions.length > 0) {
        await client.statementDeduction.createMany({
          data: deductions.map((d) => ({
            id: new UniqueEntityId(
              d.id.startsWith('insurance') || d.id.startsWith('previous') ? undefined : d.id,
            ).toValue(),
            statementId: extract.id.toValue(),
            type: deductionTypeToPrisma(d.type),
            amount: new Prisma.Decimal(d.amount),
            customLabel: d.name,
          })),
        });
      }
    };

    if (tx) {
      await run(tx);
    } else {
      await this.prisma.$transaction(run);
    }
  }

  async findById(id: UniqueEntityId): Promise<Extract | null> {
    const record = await this.prisma.statement.findFirst({
      where: { id: id.toValue(), deletedAt: null },
      include: { items: true, deductions: true },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByContractorBoqId(contractorBoqId: UniqueEntityId): Promise<Extract[]> {
    const records = await this.prisma.statement.findMany({
      where: { contractorBoqId: contractorBoqId.toValue(), deletedAt: null },
      include: { items: true, deductions: true },
      orderBy: [{ runningNumber: 'asc' }, { createdAt: 'asc' }],
    });
    return records.map((r) => this.toDomain(r));
  }

  async listAll(projectIds?: string[] | null): Promise<ExtractListItem[]> {
    const records = await this.prisma.statement.findMany({
      where: {
        deletedAt: null,
        ...(projectIds && projectIds.length > 0
          ? { contractorBoq: { building: { projectId: { in: projectIds } } } }
          : {}),
      },
      include: {
        contractorBoq: {
          include: {
            building: { select: { id: true, name: true, projectId: true, project: { select: { name: true } } } },
            subcontractor: { select: { id: true, name: true, workType: true } },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      projectId: r.contractorBoq.building.projectId,
      projectName: r.contractorBoq.building.project.name,
      buildingId: r.contractorBoq.building.id,
      buildingName: r.contractorBoq.building.name,
      contractorId: r.contractorBoq.subcontractor.id,
      contractorName: r.contractorBoq.subcontractor.name,
      workType: r.contractorBoq.subcontractor.workType,
      sequenceNumber: r.sequenceNumber,
      runningNumber: r.runningNumber,
      status: r.status,
      label: r.label,
      extractDate: r.extractDate,
      insurancePercent: r.insurancePercent.toNumber(),
      previousPaid: r.previousPaid.toNumber(),
      otherAmounts: r.otherAmounts.toNumber(),
      totalWorkValue: r.totalWorkValue.toNumber(),
      totalDeductions: r.totalDeductions.toNumber(),
      netPayable: r.netPayable.toNumber(),
      itemCount: r._count.items,
      createdAt: r.createdAt,
    }));
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await this.prisma.statement.update({
      where: { id: id.toValue() },
      data: { deletedAt: new Date() },
    });
  }

  private toDomain(record: {
    id: string;
    contractorBoqId: string;
    sequenceNumber: number;
    status: string;
    runningNumber: number | null;
    label: string | null;
    insurancePercent: Prisma.Decimal;
    extractDate: Date;
    previousPaid: Prisma.Decimal;
    otherAmounts: Prisma.Decimal;
    otherAmountItems: Prisma.JsonValue | null;
    totalWorkValue: Prisma.Decimal;
    totalDeductions: Prisma.Decimal;
    netPayable: Prisma.Decimal;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    items: {
      contractorBoqItemId: string;
      itemCode: string;
      description: string;
      unit: string;
      contractQuantity: Prisma.Decimal;
      previousQuantity: Prisma.Decimal;
      currentQuantity: Prisma.Decimal;
      totalQuantity: Prisma.Decimal;
      executionPercent: Prisma.Decimal;
      totalExecuted: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      currentWorkValue: Prisma.Decimal;
    }[];
    deductions: {
      id: string;
      type: string;
      amount: Prisma.Decimal;
      customLabel: string | null;
    }[];
  }): Extract {
    const manualDeductions: ExtractDeduction[] = record.deductions
      .filter((d) => deductionTypeFromPrisma(d.type) === 'manual')
      .map((d) => ({
        id: d.id,
        name: d.customLabel ?? '',
        amount: d.amount.toNumber(),
        type: 'manual' as const,
      }));

    return Extract.reconstitute(
      {
        contractorBoqId: new UniqueEntityId(record.contractorBoqId),
        sequenceNumber: record.sequenceNumber,
        status: record.status as ExtractStatus,
        runningNumber: record.runningNumber,
        label: record.label,
        insurancePercent: record.insurancePercent.toNumber(),
        extractDate: record.extractDate,
        previousPaid: record.previousPaid.toNumber(),
        otherAmounts: record.otherAmounts.toNumber(),
        otherAmountItems: parseOtherAmountItems(record.otherAmountItems),
        totalWorkValue: record.totalWorkValue.toNumber(),
        totalDeductions: record.totalDeductions.toNumber(),
        netPayable: record.netPayable.toNumber(),
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
      record.items.map((item) => ({
        contractorBoqItemId: item.contractorBoqItemId,
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        contractQuantity: item.contractQuantity.toNumber(),
        previous: item.previousQuantity.toNumber(),
        current: item.currentQuantity.toNumber(),
        total: item.totalQuantity.toNumber(),
        executionPercent: item.executionPercent.toNumber(),
        executedQuantity: item.totalExecuted.toNumber(),
        unitPrice: item.unitPrice.toNumber(),
        workValue: item.currentWorkValue.toNumber(),
      })),
      manualDeductions,
    );
  }
}
