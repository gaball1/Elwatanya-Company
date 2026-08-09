import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ClientStatement } from '../domain/client-statement.entity';
import { IClientStatementRepository } from '../domain/client-statement.repository';

@Injectable()
export class PrismaClientStatementRepository implements IClientStatementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(statement: ClientStatement): Promise<void> {
    const data = {
      statementNumber: statement.statementNumber,
      projectId: statement.projectId,
      projectName: statement.projectName,
      buildingId: statement.buildingId,
      buildingName: statement.buildingName,
      clientId: statement.clientId,
      clientName: statement.clientName,
      date: statement.date,
      status: statement.status,
      totalWorkValue: statement.totalWorkValue,
      totalDeductions: statement.totalDeductions,
      netPayable: statement.netPayable,
      items: statement.items,
      deductions: statement.deductions,
      signatures: statement.signatures,
      deletedAt: statement.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.clientStatement.upsert({
      where: { id: statement.id.toValue() },
      create: { id: statement.id.toValue(), ...data, createdAt: statement.createdAt },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<ClientStatement | null> {
    const record = await this.prisma.clientStatement.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<ClientStatement[]> {
    const records = await this.prisma.clientStatement.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: any): ClientStatement {
    return ClientStatement.reconstitute(
      {
        statementNumber: record.statementNumber,
        projectId: record.projectId,
        projectName: record.projectName,
        buildingId: record.buildingId,
        buildingName: record.buildingName,
        clientId: record.clientId,
        clientName: record.clientName,
        date: record.date,
        status: record.status,
        totalWorkValue: record.totalWorkValue,
        totalDeductions: record.totalDeductions,
        netPayable: record.netPayable,
        items: typeof record.items === 'string' ? JSON.parse(record.items) : record.items,
        deductions: typeof record.deductions === 'string' ? JSON.parse(record.deductions) : record.deductions,
        signatures: typeof record.signatures === 'string' ? JSON.parse(record.signatures) : record.signatures,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
