import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IFundTransactionRepository } from '../../domain/fund-transaction.repository';
import { UpdateFundTransactionInput, FundTransactionResult } from '../dto/fund-transaction.dto';
import { toResult } from './list-fund-transactions.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { applyFundBalanceEffects, balanceEffectsFor } from '../fund-balance.util';

export class UpdateFundTransactionUseCase {
  constructor(
    private readonly transactions: IFundTransactionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateFundTransactionInput): Promise<Result<FundTransactionResult>> {
    const transaction = await this.transactions.findById(new UniqueEntityId(input.id));
    if (!transaction) return Result.fail(new Error('Fund transaction not found'));

    const oldFundId = transaction.fundId;
    const oldEffect = balanceEffectsFor(transaction.type, transaction.category, transaction.status as any, transaction.amount);

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

    const newEffect = balanceEffectsFor(transaction.type, transaction.category, transaction.status as any, transaction.amount);
    const fundChanged = transaction.fundId !== oldFundId;

    // Reconcile the fund balance atomically with the row update: reverse the old effect
    // (on the old fund when the fund changed) and apply the new effect.
    await this.prisma.$transaction(async (tx) => {
      await this.transactions.save(transaction, tx);
      if (fundChanged) {
        if (oldEffect.treasuryEffect !== 0 || oldEffect.pettyCashEffect !== 0) {
          await applyFundBalanceEffects(tx, oldFundId, {
            treasuryEffect: -oldEffect.treasuryEffect,
            pettyCashEffect: -oldEffect.pettyCashEffect,
          });
        }
        if (newEffect.treasuryEffect !== 0 || newEffect.pettyCashEffect !== 0) {
          await applyFundBalanceEffects(tx, transaction.fundId, newEffect);
        }
      } else {
        const deltaTreasury = newEffect.treasuryEffect - oldEffect.treasuryEffect;
        const deltaPettyCash = newEffect.pettyCashEffect - oldEffect.pettyCashEffect;
        if (deltaTreasury !== 0 || deltaPettyCash !== 0) {
          await applyFundBalanceEffects(tx, transaction.fundId, {
            treasuryEffect: deltaTreasury,
            pettyCashEffect: deltaPettyCash,
          });
        }
      }
    });

    return Result.ok(toResult(transaction));
  }
}
