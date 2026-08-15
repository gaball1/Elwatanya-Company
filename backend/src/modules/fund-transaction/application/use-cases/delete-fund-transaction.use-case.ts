import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IFundTransactionRepository } from '../../domain/fund-transaction.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { applyFundBalanceEffects, balanceEffectsFor } from '../fund-balance.util';

export class DeleteFundTransactionUseCase {
  constructor(
    private readonly transactions: IFundTransactionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: string): Promise<Result<void>> {
    const transaction = await this.transactions.findById(new UniqueEntityId(id));
    if (!transaction) return Result.fail(new Error('Fund transaction not found'));

    const deleteResult = transaction.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    // Soft-delete the row and reverse its balance effect atomically, so deleting an
    // approved add/deduct transaction never leaves the fund balance stale.
    await this.prisma.$transaction(async (tx) => {
      await this.transactions.save(transaction, tx);
      const effect = balanceEffectsFor(transaction.type, transaction.category, transaction.status as any, transaction.amount);
      if (effect.treasuryEffect !== 0 || effect.pettyCashEffect !== 0) {
        await applyFundBalanceEffects(tx, transaction.fundId, {
          treasuryEffect: -effect.treasuryEffect,
          pettyCashEffect: -effect.pettyCashEffect,
        });
      }
    });

    return Result.ok();
  }
}
