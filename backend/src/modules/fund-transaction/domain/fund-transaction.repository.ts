import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { FundTransaction } from './fund-transaction.entity';

export const FUND_TRANSACTION_REPOSITORY = Symbol('FUND_TRANSACTION_REPOSITORY');

export interface IFundTransactionRepository {
  save(transaction: FundTransaction): Promise<void>;
  findById(id: UniqueEntityId): Promise<FundTransaction | null>;
  findAll(): Promise<FundTransaction[]>;
}
