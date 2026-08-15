import { Prisma } from '@prisma/client';
import { FundTransactionType, FundTransactionStatus } from '../domain/fund-transaction.entity';

/**
 * Computes the net effect a fund transaction has on the project fund (عهدة) balance.
 * Only approved add/request transactions increase the balance; approved deduct
 * transactions decrease it. Pending/rejected transactions have no balance effect.
 */
export function balanceEffectsFor(
  type: string,
  category: string,
  status: string,
  amount: number,
): { treasuryEffect: number; pettyCashEffect: number } {
  if (status !== 'approved') return { treasuryEffect: 0, pettyCashEffect: 0 };
  
  if (type === 'add' || type === 'request') {
    if (category === 'purchase' || category === 'miscellaneous' || category === 'petty_cash') {
       return { treasuryEffect: 0, pettyCashEffect: amount };
    }
    return { treasuryEffect: amount, pettyCashEffect: 0 };
  }
  
  if (type === 'transfer') {
    return { treasuryEffect: -amount, pettyCashEffect: amount };
  }
  
  if (type === 'deduct') {
    if (category === 'purchase' || category === 'miscellaneous' || category === 'petty_cash') {
       return { treasuryEffect: 0, pettyCashEffect: -amount };
    }
    return { treasuryEffect: -amount, pettyCashEffect: 0 };
  }
  
  return { treasuryEffect: 0, pettyCashEffect: 0 };
}

/**
 * Applies a signed balance effect to a project fund inside an existing transaction.
 * No-op when the effect is zero or the fund no longer exists (soft-deleted).
 */
export async function applyFundBalanceEffects(
  tx: Prisma.TransactionClient,
  fundId: string,
  effects: { treasuryEffect: number; pettyCashEffect: number },
): Promise<void> {
  if (effects.treasuryEffect === 0 && effects.pettyCashEffect === 0) return;
  const fund = await tx.projectFund.findFirst({
    where: { id: fundId, deletedAt: null },
  });
  if (!fund) return;
  
  const newBalance = new Prisma.Decimal(fund.currentBalance).plus(effects.treasuryEffect);
  const newPettyCash = new Prisma.Decimal(fund.pettyCashBalance).plus(effects.pettyCashEffect);
  
  await tx.projectFund.update({
    where: { id: fund.id },
    data: { 
      currentBalance: newBalance, 
      pettyCashBalance: newPettyCash,
      lastUpdated: new Date(), 
      updatedAt: new Date() 
    },
  });
}
