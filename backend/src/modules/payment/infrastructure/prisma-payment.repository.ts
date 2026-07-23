import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Payment } from '../domain/payment.entity';
import { IPaymentRepository } from '../domain/payment.repository';

@Injectable()
export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(payment: Payment): Promise<void> {
    await this.prisma.payment.create({
      data: {
        id: payment.id.toValue(),
        statementId: payment.statementId?.toValue() ?? null,
        buildingId: payment.buildingId?.toValue() ?? null,
        contractorId: payment.contractorId?.toValue() ?? null,
        amount: new Prisma.Decimal(payment.amount),
        paidAt: payment.paidAt,
        notes: payment.notes,
        createdAt: payment.createdAt,
        updatedAt: new Date(),
      },
    });
  }

  async findByBuildingAndContractor(
    buildingId: UniqueEntityId,
    contractorId: UniqueEntityId,
  ): Promise<Payment[]> {
    const records = await this.prisma.payment.findMany({
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
          deletedAt: r.deletedAt,
        },
        new UniqueEntityId(r.id),
        r.createdAt,
        r.updatedAt,
      ),
    );
  }
}
