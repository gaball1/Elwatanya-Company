import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface ClientProps {
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  joinDate: Date | null;
  status: string;
  deletedAt: Date | null;
}

export class Client extends AggregateRoot {
  private props: ClientProps;

  private constructor(
    props: ClientProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get name(): string { return this.props.name; }
  get email(): string { return this.props.email; }
  get phone(): string { return this.props.phone; }
  get address(): string { return this.props.address; }
  get contactPerson(): string { return this.props.contactPerson; }
  get joinDate(): Date | null { return this.props.joinDate; }
  get status(): string { return this.props.status; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    contactPerson?: string;
    joinDate?: Date | null;
    status?: string;
  }): Result<Client> {
    const guard = Guard.againstNullOrUndefined(input.name, 'name');
    if (guard.isFailure) return Result.fail(guard.error as Error);

    const trimmed = input.name.trim();
    if (trimmed.length === 0) return Result.fail(new Error('Client name cannot be empty'));

    return Result.ok(
      new Client({
        name: trimmed,
        email: input.email ?? '',
        phone: input.phone ?? '',
        address: input.address ?? '',
        contactPerson: input.contactPerson ?? '',
        joinDate: input.joinDate ?? null,
        status: input.status ?? 'active',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: ClientProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Client {
    return new Client(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    contactPerson?: string;
    joinDate?: Date | null;
    status?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted client'));

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Client name cannot be empty'));
      this.props.name = trimmed;
    }
    if (fields.email !== undefined) this.props.email = fields.email;
    if (fields.phone !== undefined) this.props.phone = fields.phone;
    if (fields.address !== undefined) this.props.address = fields.address;
    if (fields.contactPerson !== undefined) this.props.contactPerson = fields.contactPerson;
    if (fields.joinDate !== undefined) this.props.joinDate = fields.joinDate;
    if (fields.status !== undefined) this.props.status = fields.status;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Client is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
