import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { FundTransaction } from './fund-transaction.entity';
import { Prisma } from '@prisma/client';

export const FUND_TRANSACTION_REPOSITORY = Symbol('FUND_TRANSACTION_REPOSITORY');

export interface IFundTransactionRepository {
  save(transaction: FundTransaction, tx?: Prisma.TransactionClient): Promise<void>;
  findById(id: UniqueEntityId): Promise<FundTransaction | null>;
  findAll(): Promise<FundTransaction[]>;
}
