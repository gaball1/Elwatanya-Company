import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { FundTransaction, FundTransactionType, FundTransactionCategory, FundTransactionStatus } from '../domain/fund-transaction.entity';
import { IFundTransactionRepository } from '../domain/fund-transaction.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaFundTransactionRepository implements IFundTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(transaction: FundTransaction, tx?: Prisma.TransactionClient): Promise<void> {
    const data = {
      fundId: transaction.fundId,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date,
      status: transaction.status,
      referenceId: transaction.referenceId,
      notes: transaction.notes,
      createdBy: transaction.createdBy,
      deletedAt: transaction.deletedAt,
      updatedAt: new Date(),
    };

    const client = tx ?? this.prisma;
    await client.fundTransaction.upsert({
      where: { id: transaction.id.toValue() },
      create: {
        id: transaction.id.toValue(),
        ...data,
        createdAt: transaction.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<FundTransaction | null> {
    const record = await this.prisma.fundTransaction.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<FundTransaction[]> {
    const records = await this.prisma.fundTransaction.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    fundId: string;
    type: string;
    category: string;
    amount: import('@prisma/client/runtime/library').Decimal;
    description: string;
    date: Date;
    status: string;
    referenceId: string;
    notes: string;
    createdBy: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): FundTransaction {
    return FundTransaction.reconstitute(
      {
        fundId: record.fundId,
        type: record.type as FundTransactionType,
        category: record.category as FundTransactionCategory,
        amount: Number(record.amount),
        description: record.description,
        date: record.date,
        status: record.status as FundTransactionStatus,
        referenceId: record.referenceId,
        notes: record.notes,
        createdBy: record.createdBy,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
