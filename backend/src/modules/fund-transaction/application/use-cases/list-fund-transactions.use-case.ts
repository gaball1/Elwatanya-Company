import { Result } from '@/shared/kernel/result';
import { FundTransaction } from '../../domain/fund-transaction.entity';
import { FundTransactionResult } from '../dto/fund-transaction.dto';

export function toResult(t: FundTransaction): FundTransactionResult {
  return {
    id: t.id.toValue(),
    fundId: t.fundId,
    type: t.type,
    category: t.category,
    amount: t.amount,
    description: t.description,
    date: t.date,
    status: t.status,
    referenceId: t.referenceId,
    notes: t.notes,
    createdBy: t.createdBy,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export class ListFundTransactionsUseCase {
  constructor(private readonly transactions: import('../../domain/fund-transaction.repository').IFundTransactionRepository) {}

  async execute(): Promise<Result<FundTransactionResult[]>> {
    const list = await this.transactions.findAll();
    return Result.ok(list.map(toResult));
  }
}
