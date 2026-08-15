import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Miscellaneous } from '../domain/miscellaneous.entity';
import { IMiscellaneousRepository } from '../domain/miscellaneous.repository';
import { MiscellaneousCategory } from '../domain/miscellaneous.entity';

@Injectable()
export class PrismaMiscellaneousRepository implements IMiscellaneousRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(miscellaneous: Miscellaneous, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    const data = {
      projectId: miscellaneous.projectId,
      description: miscellaneous.description,
      amount: miscellaneous.amount,
      category: miscellaneous.category,
      date: miscellaneous.date,
      notes: miscellaneous.notes,
      invoiceFile: miscellaneous.invoiceFile,
      createdBy: miscellaneous.createdBy,
      deletedAt: miscellaneous.deletedAt,
      updatedAt: new Date(),
    };

    await client.miscellaneous.upsert({
      where: { id: miscellaneous.id.toValue() },
      create: {
        id: miscellaneous.id.toValue(),
        ...data,
        createdAt: miscellaneous.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId, tx?: Prisma.TransactionClient): Promise<Miscellaneous | null> {
    const client = tx || this.prisma;
    const record = await client.miscellaneous.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(tx?: Prisma.TransactionClient): Promise<Miscellaneous[]> {
    const client = tx || this.prisma;
    const records = await client.miscellaneous.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    projectId: string;
    description: string;
    amount: import('@prisma/client/runtime/library').Decimal;
    category: string;
    date: Date;
    notes: string;
    invoiceFile: string | null;
    createdBy: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Miscellaneous {
    return Miscellaneous.reconstitute(
      {
        projectId: record.projectId,
        description: record.description,
        amount: Number(record.amount),
        category: record.category as MiscellaneousCategory,
        date: record.date,
        notes: record.notes,
        invoiceFile: record.invoiceFile,
        createdBy: record.createdBy,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
