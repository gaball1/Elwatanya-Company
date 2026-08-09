import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Payment, PaymentStatus } from '../domain/payment.entity';
import { IPaymentRepository } from '../domain/payment.repository';

@Injectable()
export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(payment: Payment, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.payment.create({
      data: {
        id: payment.id.toValue(),
        statementId: payment.statementId?.toValue() ?? null,
        buildingId: payment.buildingId?.toValue() ?? null,
        contractorId: payment.contractorId?.toValue() ?? null,
        amount: new Prisma.Decimal(payment.amount),
        paidAt: payment.paidAt,
        notes: payment.notes,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: new Date(),
      },
    });
  }

  async findById(id: UniqueEntityId, tx?: Prisma.TransactionClient): Promise<Payment | null> {
    const client = tx || this.prisma;
    const r = await client.payment.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    if (!r) {
      return null;
    }
    return Payment.reconstitute(
      {
        statementId: r.statementId ? new UniqueEntityId(r.statementId) : null,
        buildingId: r.buildingId ? new UniqueEntityId(r.buildingId) : null,
        contractorId: r.contractorId ? new UniqueEntityId(r.contractorId) : null,
        amount: r.amount.toNumber(),
        paidAt: r.paidAt,
        notes: r.notes,
        status: (r.status as PaymentStatus) ?? 'pending',
        deletedAt: r.deletedAt,
      },
      new UniqueEntityId(r.id),
      r.createdAt,
      r.updatedAt,
    );
  }

  async findByBuildingAndContractor(
    buildingId: UniqueEntityId,
    contractorId: UniqueEntityId,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment[]> {
    const client = tx || this.prisma;
    const records = await client.payment.findMany({
      where: {
        buildingId: buildingId.toValue(),
        contractorId: contractorId.toValue(),
        deletedAt: null,
      },
      orderBy: { paidAt: 'asc' },
    });

    return records.map((r) =>
      Payment.reconstitute(
        {
          statementId: r.statementId ? new UniqueEntityId(r.statementId) : null,
          buildingId: r.buildingId ? new UniqueEntityId(r.buildingId) : null,
          contractorId: r.contractorId ? new UniqueEntityId(r.contractorId) : null,
          amount: r.amount.toNumber(),
          paidAt: r.paidAt,
          notes: r.notes,
          status: (r.status as PaymentStatus) ?? 'pending',
          deletedAt: r.deletedAt,
        },
        new UniqueEntityId(r.id),
        r.createdAt,
        r.updatedAt,
      ),
    );
  }

  async update(payment: Payment, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.payment.update({
      where: { id: payment.id.toValue() },
      data: {
        statementId: payment.statementId?.toValue() ?? null,
        buildingId: payment.buildingId?.toValue() ?? null,
        contractorId: payment.contractorId?.toValue() ?? null,
        amount: new Prisma.Decimal(payment.amount),
        paidAt: payment.paidAt,
        notes: payment.notes,
        status: payment.status,
        updatedAt: new Date(),
      },
    });
  }

  async softDelete(id: UniqueEntityId, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.payment.update({
      where: { id: id.toValue() },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }
}
