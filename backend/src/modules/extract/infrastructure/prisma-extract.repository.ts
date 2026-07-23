import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Extract } from '../domain/extract.entity';
import { IExtractRepository } from '../domain/extract.repository';
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

@Injectable()
export class PrismaExtractRepository implements IExtractRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(extract: Extract): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.statement.upsert({
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
          totalWorkValue: new Prisma.Decimal(extract.totalWorkValue),
          totalDeductions: new Prisma.Decimal(extract.totalDeductions),
          netPayable: new Prisma.Decimal(extract.netPayable),
          updatedAt: new Date(),
          deletedAt: extract.deletedAt,
        },
      });

      await tx.statementItem.deleteMany({ where: { statementId: extract.id.toValue() } });
      if (extract.items.length > 0) {
        await tx.statementItem.createMany({
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

      await tx.statementDeduction.deleteMany({ where: { statementId: extract.id.toValue() } });
      const deductions = extract.allDeductions();
      if (deductions.length > 0) {
        await tx.statementDeduction.createMany({
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
    });
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
