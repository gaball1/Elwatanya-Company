import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface SupplierProps {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  products: string[];
  paymentTerms: string;
  joinDate: Date | null;
  status: string;
  deletedAt: Date | null;
}

export class Supplier extends AggregateRoot {
  private props: SupplierProps;

  private constructor(
    props: SupplierProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get name(): string { return this.props.name; }
  get contactPerson(): string { return this.props.contactPerson; }
  get phone(): string { return this.props.phone; }
  get email(): string { return this.props.email; }
  get address(): string { return this.props.address; }
  get products(): string[] { return this.props.products; }
  get paymentTerms(): string { return this.props.paymentTerms; }
  get joinDate(): Date | null { return this.props.joinDate; }
  get status(): string { return this.props.status; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    products?: string[];
    paymentTerms?: string;
    joinDate?: Date | null;
    status?: string;
  }): Result<Supplier> {
    const guard = Guard.againstNullOrUndefined(input.name, 'name');
    if (guard.isFailure) return Result.fail(guard.error as Error);

    const trimmed = input.name.trim();
    if (trimmed.length === 0) return Result.fail(new Error('Supplier name cannot be empty'));

    return Result.ok(
      new Supplier({
        name: trimmed,
        contactPerson: input.contactPerson ?? '',
        phone: input.phone ?? '',
        email: input.email ?? '',
        address: input.address ?? '',
        products: input.products ?? [],
        paymentTerms: input.paymentTerms ?? '',
        joinDate: input.joinDate ?? null,
        status: input.status ?? 'active',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: SupplierProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Supplier {
    return new Supplier(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    name?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    products?: string[];
    paymentTerms?: string;
    joinDate?: Date | null;
    status?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted supplier'));

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Supplier name cannot be empty'));
      this.props.name = trimmed;
    }
    if (fields.contactPerson !== undefined) this.props.contactPerson = fields.contactPerson;
    if (fields.phone !== undefined) this.props.phone = fields.phone;
    if (fields.email !== undefined) this.props.email = fields.email;
    if (fields.address !== undefined) this.props.address = fields.address;
    if (fields.products !== undefined) this.props.products = fields.products;
    if (fields.paymentTerms !== undefined) this.props.paymentTerms = fields.paymentTerms;
    if (fields.joinDate !== undefined) this.props.joinDate = fields.joinDate;
    if (fields.status !== undefined) this.props.status = fields.status;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Supplier is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
