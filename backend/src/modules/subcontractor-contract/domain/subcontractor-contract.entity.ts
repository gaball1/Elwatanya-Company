import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export const CONTRACT_STATUSES = [
  'draft',
  'active',
  'completed',
  'terminated',
  'cancelled',
] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export interface SubcontractorContractProps {
  contractNumber: string;
  buildingId: string;
  subcontractorId: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  totalValue: number;
  terms: string[] | null;
  notes: string;
  status: ContractStatus;
  createdBy: string;
  deletedAt: Date | null;
}

export class SubcontractorContract extends AggregateRoot {
  private props: SubcontractorContractProps;

  private constructor(
    props: SubcontractorContractProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get contractNumber(): string { return this.props.contractNumber; }
  get buildingId(): string { return this.props.buildingId; }
  get subcontractorId(): string { return this.props.subcontractorId; }
  get title(): string { return this.props.title; }
  get startDate(): Date | null { return this.props.startDate; }
  get endDate(): Date | null { return this.props.endDate; }
  get totalValue(): number { return this.props.totalValue; }
  get terms(): string[] | null { return this.props.terms; }
  get notes(): string { return this.props.notes; }
  get status(): ContractStatus { return this.props.status; }
  get createdBy(): string { return this.props.createdBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    contractNumber: string;
    buildingId: string;
    subcontractorId: string;
    title?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    totalValue?: number;
    terms?: string[] | null;
    notes?: string;
    status?: ContractStatus;
    createdBy?: string;
  }): Result<SubcontractorContract> {
    const buildingGuard = Guard.againstNullOrUndefined(input.buildingId, 'buildingId');
    if (buildingGuard.isFailure) return Result.fail(buildingGuard.error as Error);

    const subGuard = Guard.againstNullOrUndefined(input.subcontractorId, 'subcontractorId');
    if (subGuard.isFailure) return Result.fail(subGuard.error as Error);

    const numberGuard = Guard.againstNullOrUndefined(input.contractNumber, 'contractNumber');
    if (numberGuard.isFailure) return Result.fail(numberGuard.error as Error);

    if (input.status && !CONTRACT_STATUSES.includes(input.status)) {
      return Result.fail(new Error(`Invalid contract status. Must be one of: ${CONTRACT_STATUSES.join(', ')}`));
    }

    if (input.totalValue !== undefined && input.totalValue < 0) {
      return Result.fail(new Error('Total value cannot be negative'));
    }

    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      return Result.fail(new Error('End date cannot be before start date'));
    }

    return Result.ok(
      new SubcontractorContract({
        contractNumber: input.contractNumber.trim(),
        buildingId: input.buildingId,
        subcontractorId: input.subcontractorId,
        title: input.title ?? '',
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        totalValue: input.totalValue ?? 0,
        terms: input.terms ?? null,
        notes: input.notes ?? '',
        status: input.status ?? 'draft',
        createdBy: input.createdBy ?? '',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: SubcontractorContractProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): SubcontractorContract {
    return new SubcontractorContract(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    title?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    totalValue?: number;
    terms?: string[] | null;
    notes?: string;
    status?: ContractStatus;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted contract'));

    if (fields.status !== undefined && !CONTRACT_STATUSES.includes(fields.status)) {
      return Result.fail(new Error(`Invalid contract status. Must be one of: ${CONTRACT_STATUSES.join(', ')}`));
    }

    if (fields.totalValue !== undefined && fields.totalValue < 0) {
      return Result.fail(new Error('Total value cannot be negative'));
    }

    const start = fields.startDate !== undefined ? fields.startDate : this.props.startDate;
    const end = fields.endDate !== undefined ? fields.endDate : this.props.endDate;
    if (start && end && end < start) {
      return Result.fail(new Error('End date cannot be before start date'));
    }

    if (fields.title !== undefined) this.props.title = fields.title;
    if (fields.startDate !== undefined) this.props.startDate = fields.startDate;
    if (fields.endDate !== undefined) this.props.endDate = fields.endDate;
    if (fields.totalValue !== undefined) this.props.totalValue = fields.totalValue;
    if (fields.terms !== undefined) this.props.terms = fields.terms;
    if (fields.notes !== undefined) this.props.notes = fields.notes;
    if (fields.status !== undefined) this.props.status = fields.status;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Contract is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
