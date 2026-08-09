import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface HolidayProps {
  name: string;
  date: Date;
  description: string;
  isRecurring: boolean;
  deletedAt: Date | null;
}

export class Holiday extends AggregateRoot {
  private props: HolidayProps;

  private constructor(
    props: HolidayProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get name(): string { return this.props.name; }
  get date(): Date { return this.props.date; }
  get description(): string { return this.props.description; }
  get isRecurring(): boolean { return this.props.isRecurring; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    name: string;
    date: Date;
    description?: string;
    isRecurring?: boolean;
  }): Result<Holiday> {
    const guard = Guard.againstNullOrUndefined(input.name, 'name');
    if (guard.isFailure) return Result.fail(guard.error as Error);

    const trimmed = input.name.trim();
    if (trimmed.length === 0) return Result.fail(new Error('Holiday name cannot be empty'));

    return Result.ok(
      new Holiday({
        name: trimmed,
        date: input.date,
        description: input.description ?? '',
        isRecurring: input.isRecurring ?? false,
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: HolidayProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Holiday {
    return new Holiday(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    name?: string;
    date?: Date;
    description?: string;
    isRecurring?: boolean;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted holiday'));

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Holiday name cannot be empty'));
      this.props.name = trimmed;
    }
    if (fields.date !== undefined) this.props.date = fields.date;
    if (fields.description !== undefined) this.props.description = fields.description;
    if (fields.isRecurring !== undefined) this.props.isRecurring = fields.isRecurring;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Holiday is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
