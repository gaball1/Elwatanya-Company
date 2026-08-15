import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export type MiscellaneousCategory = 'food' | 'transport' | 'tools' | 'other';

export interface MiscellaneousProps {
  projectId: string;
  description: string;
  amount: number;
  category: MiscellaneousCategory;
  date: Date;
  notes: string;
  invoiceFile: string | null;
  createdBy: string;
  deletedAt: Date | null;
}

export class Miscellaneous extends AggregateRoot {
  private props: MiscellaneousProps;

  private constructor(
    props: MiscellaneousProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get projectId(): string { return this.props.projectId; }
  get description(): string { return this.props.description; }
  get amount(): number { return this.props.amount; }
  get category(): MiscellaneousCategory { return this.props.category; }
  get date(): Date { return this.props.date; }
  get notes(): string { return this.props.notes; }
  get invoiceFile(): string | null { return this.props.invoiceFile; }
  get createdBy(): string { return this.props.createdBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    projectId: string;
    description: string;
    amount: number;
    category: MiscellaneousCategory;
    date: Date;
    notes?: string;
    invoiceFile?: string | null;
    createdBy: string;
  }): Result<Miscellaneous> {
    const guard1 = Guard.againstNullOrUndefined(input.projectId, 'projectId');
    const guard2 = Guard.againstNullOrUndefined(input.description, 'description');
    const guard3 = Guard.againstNullOrUndefined(input.amount, 'amount');
    const guard4 = Guard.againstNullOrUndefined(input.category, 'category');
    const guard5 = Guard.againstNullOrUndefined(input.date, 'date');
    const guard6 = Guard.againstNullOrUndefined(input.createdBy, 'createdBy');
    const combined = Guard.combine(guard1, guard2, guard3, guard4, guard5, guard6);
    if (combined.isFailure) return Result.fail(combined.error as Error);

    const trimmed = input.description.trim();
    if (trimmed.length === 0) return Result.fail(new Error('Description cannot be empty'));

    const categories: MiscellaneousCategory[] = ['food', 'transport', 'tools', 'other'];
    if (!categories.includes(input.category)) return Result.fail(new Error('Invalid category'));

    if (input.amount < 0) return Result.fail(new Error('Amount cannot be negative'));

    const invoiceFile = input.invoiceFile?.trim() ?? '';
    if (invoiceFile.length === 0) return Result.fail(new Error('Invoice file is required'));

    return Result.ok(
      new Miscellaneous({
        projectId: input.projectId,
        description: trimmed,
        amount: input.amount,
        category: input.category,
        date: input.date,
        notes: input.notes ?? '',
        invoiceFile,
        createdBy: input.createdBy,
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: MiscellaneousProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Miscellaneous {
    return new Miscellaneous(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    description?: string;
    amount?: number;
    category?: MiscellaneousCategory;
    date?: Date;
    notes?: string;
    invoiceFile?: string | null;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted miscellaneous record'));

    if (fields.description !== undefined) {
      const trimmed = fields.description.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Description cannot be empty'));
      this.props.description = trimmed;
    }
    if (fields.amount !== undefined) {
      if (fields.amount < 0) return Result.fail(new Error('Amount cannot be negative'));
      this.props.amount = fields.amount;
    }
    if (fields.category !== undefined) {
      const categories: MiscellaneousCategory[] = ['food', 'transport', 'tools', 'other'];
      if (!categories.includes(fields.category)) return Result.fail(new Error('Invalid category'));
      this.props.category = fields.category;
    }
    if (fields.date !== undefined) this.props.date = fields.date;
    if (fields.notes !== undefined) this.props.notes = fields.notes;
    if (fields.invoiceFile !== undefined) this.props.invoiceFile = fields.invoiceFile;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Miscellaneous record is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
