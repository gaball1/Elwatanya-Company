import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface SubcontractorProps {
  name: string;
  workType: string;
  marginType: string;
  marginValue: number;
  phone: string;
  email: string;
  address: string;
  joinDate: Date | null;
  status: string;
  deletedAt: Date | null;
}

export class Subcontractor extends AggregateRoot {
  private props: SubcontractorProps;

  private constructor(
    props: SubcontractorProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get name(): string {
    return this.props.name;
  }

  get workType(): string {
    return this.props.workType;
  }

  get marginType(): string {
    return this.props.marginType;
  }

  get marginValue(): number {
    return this.props.marginValue;
  }

  get phone(): string {
    return this.props.phone;
  }

  get email(): string {
    return this.props.email;
  }

  get address(): string {
    return this.props.address;
  }

  get joinDate(): Date | null {
    return this.props.joinDate;
  }

  get status(): string {
    return this.props.status;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  public static create(input: {
    name: string;
    workType?: string;
    marginType?: string;
    marginValue?: number;
    phone?: string;
    email?: string;
    address?: string;
    joinDate?: Date | null;
    status?: string;
  }): Result<Subcontractor> {
    const guard = Guard.againstNullOrUndefined(input.name, 'name');
    if (guard.isFailure) {
      return Result.fail(guard.error as Error);
    }

    const trimmed = input.name.trim();
    if (trimmed.length === 0) {
      return Result.fail(new Error('Subcontractor name cannot be empty'));
    }

    return Result.ok(
      new Subcontractor({
        name: trimmed,
        workType: input.workType ?? '',
        marginType: input.marginType ?? 'percentage',
        marginValue: input.marginValue ?? 0,
        phone: input.phone ?? '',
        email: input.email ?? '',
        address: input.address ?? '',
        joinDate: input.joinDate ?? null,
        status: input.status ?? 'active',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: SubcontractorProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Subcontractor {
    return new Subcontractor(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    name?: string;
    workType?: string;
    marginType?: string;
    marginValue?: number;
    phone?: string;
    email?: string;
    address?: string;
    joinDate?: Date | null;
    status?: string;
  }): Result<void> {
    if (this.isDeleted) {
      return Result.fail(new Error('Cannot update a deleted subcontractor'));
    }

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (trimmed.length === 0) {
        return Result.fail(new Error('Subcontractor name cannot be empty'));
      }
      this.props.name = trimmed;
    }
    if (fields.workType !== undefined) this.props.workType = fields.workType;
    if (fields.marginType !== undefined) this.props.marginType = fields.marginType;
    if (fields.marginValue !== undefined) this.props.marginValue = fields.marginValue;
    if (fields.phone !== undefined) this.props.phone = fields.phone;
    if (fields.email !== undefined) this.props.email = fields.email;
    if (fields.address !== undefined) this.props.address = fields.address;
    if (fields.joinDate !== undefined) this.props.joinDate = fields.joinDate;
    if (fields.status !== undefined) this.props.status = fields.status;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) {
      return Result.fail(new Error('Subcontractor is already deleted'));
    }
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
