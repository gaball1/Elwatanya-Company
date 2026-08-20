import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { SubcontractorStatement } from '../domain/subcontractor-statement.entity';
import { ISubcontractorStatementRepository } from '../domain/subcontractor-statement.repository';

@Injectable()
export class PrismaSubcontractorStatementRepository implements ISubcontractorStatementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(statement: SubcontractorStatement): Promise<void> {
    const data = {
      statementNumber: statement.statementNumber, projectId: statement.projectId,
      projectName: statement.projectName, buildingId: statement.buildingId,
      buildingName: statement.buildingName, subcontractorId: statement.subcontractorId,
      subcontractorName: statement.subcontractorName, workType: statement.workType,
      date: statement.date, status: statement.status, blockNumber: statement.blockNumber,
      formNumber: statement.formNumber, insurancePercent: statement.insurancePercent,
      totalWorkValue: statement.totalWorkValue, totalInsurance: statement.totalInsurance,
      totalDeductions: statement.totalDeductions, previousPaid: statement.previousPaid,
      netPayable: statement.netPayable, runningNumber: statement.runningNumber,
      items: statement.items, deductions: statement.deductions, signatures: statement.signatures,
      deletedAt: statement.deletedAt, updatedAt: new Date(),
    };

    await this.prisma.subcontractorStatement.upsert({
      where: { id: statement.id.toValue() },
      create: { id: statement.id.toValue(), ...data, createdAt: statement.createdAt },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<SubcontractorStatement | null> {
    const record = await this.prisma.subcontractorStatement.findFirst({ where: { id: id.toValue(), deletedAt: null } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<SubcontractorStatement[]> {
    const records = await this.prisma.subcontractorStatement.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: any): SubcontractorStatement {
    return SubcontractorStatement.reconstitute({
      statementNumber: record.statementNumber, projectId: record.projectId,
      projectName: record.projectName, buildingId: record.buildingId,
      buildingName: record.buildingName, subcontractorId: record.subcontractorId,
      subcontractorName: record.subcontractorName, workType: record.workType,
      date: record.date, status: record.status, blockNumber: record.blockNumber,
      formNumber: record.formNumber, insurancePercent: Number(record.insurancePercent),
      totalWorkValue: Number(record.totalWorkValue), totalInsurance: Number(record.totalInsurance),
      totalDeductions: Number(record.totalDeductions), previousPaid: Number(record.previousPaid),
      netPayable: Number(record.netPayable), runningNumber: record.runningNumber,
      items: typeof record.items === 'string' ? JSON.parse(record.items) : record.items,
      deductions: typeof record.deductions === 'string' ? JSON.parse(record.deductions) : record.deductions,
      signatures: typeof record.signatures === 'string' ? JSON.parse(record.signatures) : record.signatures,
      deletedAt: record.deletedAt,
    }, new UniqueEntityId(record.id), record.createdAt, record.updatedAt);
  }
}
