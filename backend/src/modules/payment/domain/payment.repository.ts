import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Payment } from './payment.entity';
import { Prisma } from '@prisma/client';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface IPaymentRepository {
  save(payment: Payment, tx?: Prisma.TransactionClient): Promise<void>;
  findById(id: UniqueEntityId, tx?: Prisma.TransactionClient): Promise<Payment | null>;
  findByBuildingAndContractor(
    buildingId: UniqueEntityId,
    contractorId: UniqueEntityId,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment[]>;
  update(payment: Payment, tx?: Prisma.TransactionClient): Promise<void>;
  softDelete(id: UniqueEntityId, tx?: Prisma.TransactionClient): Promise<void>;
}
