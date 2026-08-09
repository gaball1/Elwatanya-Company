import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IFundTransactionRepository } from '../../domain/fund-transaction.repository';

export class DeleteFundTransactionUseCase {
  constructor(private readonly transactions: IFundTransactionRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const transaction = await this.transactions.findById(new UniqueEntityId(id));
    if (!transaction) return Result.fail(new Error('Fund transaction not found'));

    const deleteResult = transaction.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.transactions.save(transaction);
    return Result.ok();
  }
}
