import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IFundTransactionRepository } from '../../domain/fund-transaction.repository';
import { UpdateFundTransactionInput, FundTransactionResult } from '../dto/fund-transaction.dto';
import { toResult } from './list-fund-transactions.use-case';

export class UpdateFundTransactionUseCase {
  constructor(private readonly transactions: IFundTransactionRepository) {}

  async execute(input: UpdateFundTransactionInput): Promise<Result<FundTransactionResult>> {
    const transaction = await this.transactions.findById(new UniqueEntityId(input.id));
    if (!transaction) return Result.fail(new Error('Fund transaction not found'));

    const updateResult = transaction.update({
      fundId: input.fundId,
      type: input.type,
      category: input.category,
      amount: input.amount,
      description: input.description,
      date: input.date,
      status: input.status,
      referenceId: input.referenceId,
      notes: input.notes,
      createdBy: input.createdBy,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.transactions.save(transaction);
    return Result.ok(toResult(transaction));
  }
}
