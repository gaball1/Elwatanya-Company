import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface ClientStatementProps {
  statementNumber: string;
  projectId: string;
  projectName: string;
  buildingId: string;
  buildingName: string;
  clientId: string;
  clientName: string;
  date: Date;
  status: string;
  totalWorkValue: number;
  totalDeductions: number;
  netPayable: number;
  items: any[];
  deductions: any[];
  signatures: any[];
  deletedAt: Date | null;
}

export class ClientStatement extends AggregateRoot {
  private props: ClientStatementProps;

  private constructor(props: ClientStatementProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get statementNumber() { return this.props.statementNumber; }
  get projectId() { return this.props.projectId; }
  get projectName() { return this.props.projectName; }
  get buildingId() { return this.props.buildingId; }
  get buildingName() { return this.props.buildingName; }
  get clientId() { return this.props.clientId; }
  get clientName() { return this.props.clientName; }
  get date() { return this.props.date; }
  get status() { return this.props.status; }
  get totalWorkValue() { return this.props.totalWorkValue; }
  get totalDeductions() { return this.props.totalDeductions; }
  get netPayable() { return this.props.netPayable; }
  get items() { return this.props.items; }
  get deductions() { return this.props.deductions; }
  get signatures() { return this.props.signatures; }
  get deletedAt() { return this.props.deletedAt; }
  get isDeleted() { return this.props.deletedAt !== null; }

  public static create(input: {
    statementNumber?: string;
    projectId: string;
    projectName?: string;
    buildingId?: string;
    buildingName?: string;
    clientId: string;
    clientName?: string;
    date?: Date;
    status?: string;
    totalWorkValue?: number;
    totalDeductions?: number;
    netPayable?: number;
    items?: any[];
    deductions?: any[];
    signatures?: any[];
  }): Result<ClientStatement> {
    const guard1 = Guard.againstNullOrUndefined(input.projectId, 'projectId');
    const guard2 = Guard.againstNullOrUndefined(input.clientId, 'clientId');
    const combined = Guard.combine(guard1, guard2);
    if (combined.isFailure) return Result.fail(combined.error as Error);

    const validStatuses = ['pending', 'approved', 'rejected'];
    const status = input.status ?? 'pending';
    if (!validStatuses.includes(status)) return Result.fail(new Error('Invalid status'));

    return Result.ok(new ClientStatement({
      statementNumber: input.statementNumber ?? '',
      projectId: input.projectId,
      projectName: input.projectName ?? '',
      buildingId: input.buildingId ?? '',
      buildingName: input.buildingName ?? '',
      clientId: input.clientId,
      clientName: input.clientName ?? '',
      date: input.date ?? new Date(),
      status,
      totalWorkValue: input.totalWorkValue ?? 0,
      totalDeductions: input.totalDeductions ?? 0,
      netPayable: input.netPayable ?? 0,
      items: input.items ?? [],
      deductions: input.deductions ?? [],
      signatures: input.signatures ?? [],
      deletedAt: null,
    }));
  }

  public static reconstitute(props: ClientStatementProps, id: UniqueEntityId, createdAt: Date, updatedAt: Date): ClientStatement {
    return new ClientStatement(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    statementNumber?: string; projectId?: string; projectName?: string;
    buildingId?: string; buildingName?: string; clientId?: string; clientName?: string;
    date?: Date; status?: string; totalWorkValue?: number; totalDeductions?: number;
    netPayable?: number; items?: any[]; deductions?: any[]; signatures?: any[];
  }): Result<void> {
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
