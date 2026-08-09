import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface SubcontractorStatementProps {
  statementNumber: string;
  projectId: string;
  projectName: string;
  buildingId: string;
  buildingName: string;
  subcontractorId: string;
  subcontractorName: string;
  workType: string;
  date: Date;
  status: string;
  blockNumber: string;
  formNumber: string;
  insurancePercent: number;
  totalWorkValue: number;
  totalInsurance: number;
  totalDeductions: number;
  previousPaid: number;
  netPayable: number;
  runningNumber: number;
  items: any[];
  deductions: any[];
  signatures: any[];
  deletedAt: Date | null;
}

export class SubcontractorStatement extends AggregateRoot {
  private props: SubcontractorStatementProps;

  private constructor(props: SubcontractorStatementProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get statementNumber() { return this.props.statementNumber; }
  get projectId() { return this.props.projectId; }
  get projectName() { return this.props.projectName; }
  get buildingId() { return this.props.buildingId; }
  get buildingName() { return this.props.buildingName; }
  get subcontractorId() { return this.props.subcontractorId; }
  get subcontractorName() { return this.props.subcontractorName; }
  get workType() { return this.props.workType; }
  get date() { return this.props.date; }
  get status() { return this.props.status; }
  get blockNumber() { return this.props.blockNumber; }
  get formNumber() { return this.props.formNumber; }
  get insurancePercent() { return this.props.insurancePercent; }
  get totalWorkValue() { return this.props.totalWorkValue; }
  get totalInsurance() { return this.props.totalInsurance; }
  get totalDeductions() { return this.props.totalDeductions; }
  get previousPaid() { return this.props.previousPaid; }
  get netPayable() { return this.props.netPayable; }
  get runningNumber() { return this.props.runningNumber; }
  get items() { return this.props.items; }
  get deductions() { return this.props.deductions; }
  get signatures() { return this.props.signatures; }
  get deletedAt() { return this.props.deletedAt; }
  get isDeleted() { return this.props.deletedAt !== null; }

  public static create(input: {
    statementNumber?: string; projectId: string; projectName?: string;
    buildingId?: string; buildingName?: string; subcontractorId: string;
    subcontractorName?: string; workType?: string; date?: Date; status?: string;
    blockNumber?: string; formNumber?: string; insurancePercent?: number;
    totalWorkValue?: number; totalInsurance?: number; totalDeductions?: number;
    previousPaid?: number; netPayable?: number; runningNumber?: number;
    items?: any[]; deductions?: any[]; signatures?: any[];
  }): Result<SubcontractorStatement> {
    const guard1 = Guard.againstNullOrUndefined(input.projectId, 'projectId');
    const guard2 = Guard.againstNullOrUndefined(input.subcontractorId, 'subcontractorId');
    const combined = Guard.combine(guard1, guard2);
    if (combined.isFailure) return Result.fail(combined.error as Error);

    const validStatuses = ['pending', 'approved', 'rejected'];
    const status = input.status ?? 'pending';
    if (!validStatuses.includes(status)) return Result.fail(new Error('Invalid status'));

    return Result.ok(new SubcontractorStatement({
      statementNumber: input.statementNumber ?? '', projectId: input.projectId,
      projectName: input.projectName ?? '', buildingId: input.buildingId ?? '',
      buildingName: input.buildingName ?? '', subcontractorId: input.subcontractorId,
      subcontractorName: input.subcontractorName ?? '', workType: input.workType ?? '',
      date: input.date ?? new Date(), status, blockNumber: input.blockNumber ?? '',
      formNumber: input.formNumber ?? '', insurancePercent: input.insurancePercent ?? 0,
      totalWorkValue: input.totalWorkValue ?? 0, totalInsurance: input.totalInsurance ?? 0,
      totalDeductions: input.totalDeductions ?? 0, previousPaid: input.previousPaid ?? 0,
      netPayable: input.netPayable ?? 0, runningNumber: input.runningNumber ?? 0,
      items: input.items ?? [], deductions: input.deductions ?? [], signatures: input.signatures ?? [],
      deletedAt: null,
    }));
  }

  public static reconstitute(props: SubcontractorStatementProps, id: UniqueEntityId, createdAt: Date, updatedAt: Date): SubcontractorStatement {
    return new SubcontractorStatement(props, id, createdAt, updatedAt);
  }

  public update(fields: Partial<SubcontractorStatementProps>): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted statement'));
    if (fields.status !== undefined) {
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(fields.status)) return Result.fail(new Error('Invalid status'));
    }
    Object.assign(this.props, fields);
    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Statement is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
