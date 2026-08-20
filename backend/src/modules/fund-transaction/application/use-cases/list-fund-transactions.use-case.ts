import { Result } from '@/shared/kernel/result';
import { FundTransaction } from '../../domain/fund-transaction.entity';
import { FundTransactionResult } from '../dto/fund-transaction.dto';
import { OwnershipActor } from '@/common/services/ownership.service';

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

  async execute(actor?: OwnershipActor): Promise<Result<FundTransactionResult[]>> {
    // SUPER_ADMIN sees everything; others only transactions from assigned
    // projects (scoped at the SQL level via the fund's project relation).
    let projectIds: string[] | undefined;
    if (actor && typeof actor === 'object') {
      if (!(Array.isArray(actor.roleNames) && actor.roleNames.includes('SUPER_ADMIN'))) {
        projectIds = actor.projectIds?.length ? actor.projectIds : actor.projectId ? [actor.projectId] : [];
      }
    }

    const list = await this.transactions.findAll(projectIds);
    return Result.ok(list.map(toResult));
  }
}
