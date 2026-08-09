import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface ProjectFundProps {
  projectId: string;
  initialBalance: number;
  currentBalance: number;
  lastUpdated: Date;
  deletedAt: Date | null;
}

export class ProjectFund extends AggregateRoot {
  private props: ProjectFundProps;

  private constructor(
    props: ProjectFundProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get projectId(): string { return this.props.projectId; }
  get initialBalance(): number { return this.props.initialBalance; }
  get currentBalance(): number { return this.props.currentBalance; }
  get lastUpdated(): Date { return this.props.lastUpdated; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    projectId: string;
    initialBalance?: number;
    currentBalance?: number;
  }): Result<ProjectFund> {
    const guard = Guard.againstNullOrUndefined(input.projectId, 'projectId');
    if (guard.isFailure) return Result.fail(guard.error as Error);

    const initialBalance = input.initialBalance ?? 0;
    const currentBalance = input.currentBalance ?? initialBalance;

    if (initialBalance < 0) return Result.fail(new Error('Initial balance cannot be negative'));
    if (currentBalance < 0) return Result.fail(new Error('Current balance cannot be negative'));

    return Result.ok(
      new ProjectFund({
        projectId: input.projectId,
        initialBalance,
        currentBalance,
        lastUpdated: new Date(),
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: ProjectFundProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): ProjectFund {
    return new ProjectFund(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    initialBalance?: number;
    currentBalance?: number;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted project fund'));

    if (fields.initialBalance !== undefined) {
      if (fields.initialBalance < 0) return Result.fail(new Error('Initial balance cannot be negative'));
      this.props.initialBalance = fields.initialBalance;
    }
    if (fields.currentBalance !== undefined) {
      if (fields.currentBalance < 0) return Result.fail(new Error('Current balance cannot be negative'));
      this.props.currentBalance = fields.currentBalance;
    }

    this.props.lastUpdated = new Date();
    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Project fund is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }

  public restore(initialBalance: number): Result<void> {
    if (!this.isDeleted) return Result.fail(new Error('Project fund is not deleted'));
    if (initialBalance < 0) return Result.fail(new Error('Initial balance cannot be negative'));
    this.props.initialBalance = initialBalance;
    this.props.currentBalance = initialBalance;
    this.props.deletedAt = null;
    this.props.lastUpdated = new Date();
    return Result.ok();
  }
}
