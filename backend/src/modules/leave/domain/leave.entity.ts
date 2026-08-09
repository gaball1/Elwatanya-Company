import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface LeaveProps {
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  daysCount: number;
  reason: string;
  status: string;
  approvedBy: string;
  deletedAt: Date | null;
}

export class Leave extends AggregateRoot {
  private props: LeaveProps;

  private constructor(
    props: LeaveProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get employeeId(): string { return this.props.employeeId; }
  get leaveType(): string { return this.props.leaveType; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get daysCount(): number { return this.props.daysCount; }
  get reason(): string { return this.props.reason; }
  get status(): string { return this.props.status; }
  get approvedBy(): string { return this.props.approvedBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    employeeId: string;
    leaveType?: string;
    startDate: Date;
    endDate: Date;
    daysCount?: number;
    reason?: string;
    status?: string;
    approvedBy?: string;
  }): Result<Leave> {
    const guard = Guard.againstNullOrUndefined(input.employeeId, 'employeeId');
    if (guard.isFailure) return Result.fail(guard.error as Error);

    const trimmed = input.employeeId.trim();
    if (trimmed.length === 0) return Result.fail(new Error('Employee ID cannot be empty'));

    return Result.ok(
      new Leave({
        employeeId: trimmed,
        leaveType: input.leaveType ?? 'annual',
        startDate: input.startDate,
        endDate: input.endDate,
        daysCount: input.daysCount ?? 1,
        reason: input.reason ?? '',
        status: input.status ?? 'pending',
        approvedBy: input.approvedBy ?? '',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: LeaveProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Leave {
    return new Leave(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    employeeId?: string;
    leaveType?: string;
    startDate?: Date;
    endDate?: Date;
    daysCount?: number;
    reason?: string;
    status?: string;
    approvedBy?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted leave'));

    if (fields.employeeId !== undefined) {
      const trimmed = fields.employeeId.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Employee ID cannot be empty'));
      this.props.employeeId = trimmed;
    }
    if (fields.leaveType !== undefined) this.props.leaveType = fields.leaveType;
    if (fields.startDate !== undefined) this.props.startDate = fields.startDate;
    if (fields.endDate !== undefined) this.props.endDate = fields.endDate;
    if (fields.daysCount !== undefined) this.props.daysCount = fields.daysCount;
    if (fields.reason !== undefined) this.props.reason = fields.reason;
    if (fields.status !== undefined) this.props.status = fields.status;
    if (fields.approvedBy !== undefined) this.props.approvedBy = fields.approvedBy;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Leave is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
