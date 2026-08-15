import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export const FUND_TRANSACTION_TYPES = ['add', 'deduct', 'request', 'transfer'] as const;
export const FUND_TRANSACTION_CATEGORIES = ['general', 'purchase', 'miscellaneous', 'petty_cash', 'extract'] as const;
export const FUND_TRANSACTION_STATUSES = ['pending', 'approved', 'rejected'] as const;

export type FundTransactionType = typeof FUND_TRANSACTION_TYPES[number];
export type FundTransactionCategory = typeof FUND_TRANSACTION_CATEGORIES[number];
export type FundTransactionStatus = typeof FUND_TRANSACTION_STATUSES[number];

export interface FundTransactionProps {
  fundId: string;
  type: FundTransactionType;
  category: FundTransactionCategory;
  amount: number;
  description: string;
  date: Date;
  status: FundTransactionStatus;
  referenceId: string;
  notes: string;
  createdBy: string;
  deletedAt: Date | null;
}

export class FundTransaction extends AggregateRoot {
  private props: FundTransactionProps;

  private constructor(
    props: FundTransactionProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get fundId(): string { return this.props.fundId; }
  get type(): FundTransactionType { return this.props.type; }
  get category(): FundTransactionCategory { return this.props.category; }
  get amount(): number { return this.props.amount; }
  get description(): string { return this.props.description; }
  get date(): Date { return this.props.date; }
  get status(): FundTransactionStatus { return this.props.status; }
  get referenceId(): string { return this.props.referenceId; }
  get notes(): string { return this.props.notes; }
  get createdBy(): string { return this.props.createdBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    fundId: string;
    type: FundTransactionType;
    amount: number;
    category?: FundTransactionCategory;
    description?: string;
    date?: Date;
    status?: FundTransactionStatus;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
  }): Result<FundTransaction> {
    const guard = Guard.againstNullOrUndefined(input.fundId, 'fundId');
    if (guard.isFailure) return Result.fail(guard.error as Error);

    const typeGuard = Guard.againstNullOrUndefined(input.type, 'type');
    if (typeGuard.isFailure) return Result.fail(typeGuard.error as Error);

    if (!FUND_TRANSACTION_TYPES.includes(input.type)) {
      return Result.fail(new Error(`Invalid fund transaction type. Must be one of: ${FUND_TRANSACTION_TYPES.join(', ')}`));
    }

    if (input.category && !FUND_TRANSACTION_CATEGORIES.includes(input.category)) {
      return Result.fail(new Error(`Invalid fund transaction category. Must be one of: ${FUND_TRANSACTION_CATEGORIES.join(', ')}`));
    }

    if (input.status && !FUND_TRANSACTION_STATUSES.includes(input.status)) {
      return Result.fail(new Error(`Invalid fund transaction status. Must be one of: ${FUND_TRANSACTION_STATUSES.join(', ')}`));
    }

    if (input.amount <= 0) {
      return Result.fail(new Error('Amount must be greater than zero'));
    }

    return Result.ok(
      new FundTransaction({
        fundId: input.fundId,
        type: input.type,
        category: input.category ?? 'general',
        amount: input.amount,
        description: input.description ?? '',
        date: input.date ?? new Date(),
        status: input.status ?? 'pending',
        referenceId: input.referenceId ?? '',
        notes: input.notes ?? '',
        createdBy: input.createdBy ?? '',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: FundTransactionProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): FundTransaction {
    return new FundTransaction(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    fundId?: string;
    type?: FundTransactionType;
    category?: FundTransactionCategory;
    amount?: number;
    description?: string;
    date?: Date;
    status?: FundTransactionStatus;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted fund transaction'));

    if (fields.type !== undefined && !FUND_TRANSACTION_TYPES.includes(fields.type)) {
      return Result.fail(new Error(`Invalid fund transaction type. Must be one of: ${FUND_TRANSACTION_TYPES.join(', ')}`));
    }

    if (fields.category !== undefined && !FUND_TRANSACTION_CATEGORIES.includes(fields.category)) {
      return Result.fail(new Error(`Invalid fund transaction category. Must be one of: ${FUND_TRANSACTION_CATEGORIES.join(', ')}`));
    }

    if (fields.status !== undefined && !FUND_TRANSACTION_STATUSES.includes(fields.status)) {
      return Result.fail(new Error(`Invalid fund transaction status. Must be one of: ${FUND_TRANSACTION_STATUSES.join(', ')}`));
    }

    if (fields.amount !== undefined && fields.amount <= 0) {
      return Result.fail(new Error('Amount must be greater than zero'));
    }

    if (fields.fundId !== undefined) this.props.fundId = fields.fundId;
    if (fields.type !== undefined) this.props.type = fields.type;
    if (fields.category !== undefined) this.props.category = fields.category;
    if (fields.amount !== undefined) this.props.amount = fields.amount;
    if (fields.description !== undefined) this.props.description = fields.description;
    if (fields.date !== undefined) this.props.date = fields.date;
    if (fields.status !== undefined) this.props.status = fields.status;
    if (fields.referenceId !== undefined) this.props.referenceId = fields.referenceId;
    if (fields.notes !== undefined) this.props.notes = fields.notes;
    if (fields.createdBy !== undefined) this.props.createdBy = fields.createdBy;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Fund transaction is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
