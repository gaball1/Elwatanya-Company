import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface RoleProps {
  name: string;
  description: string;
  permissions: string[];
  status: string;
  deletedAt: Date | null;
}

export class Role extends AggregateRoot {
  private props: RoleProps;

  private constructor(props: RoleProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get permissions(): string[] { return [...this.props.permissions]; }
  get status(): string { return this.props.status; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: { name: string; description?: string; permissions?: string[]; status?: string }): Result<Role> {
    const guard = Guard.againstNullOrUndefined(input.name, 'name');
    if (guard.isFailure) return Result.fail(guard.error as Error);
    const trimmed = input.name.trim();
    if (trimmed.length === 0) return Result.fail(new Error('Role name cannot be empty'));
    return Result.ok(
      new Role({
        name: trimmed,
        description: input.description ?? '',
        permissions: input.permissions ?? [],
        status: input.status ?? 'active',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(props: RoleProps, id: UniqueEntityId, createdAt: Date, updatedAt: Date): Role {
    return new Role(props, id, createdAt, updatedAt);
  }

  public update(fields: { name?: string; description?: string; permissions?: string[]; status?: string }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted role'));
    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Role name cannot be empty'));
      this.props.name = trimmed;
    }
    if (fields.description !== undefined) this.props.description = fields.description;
    if (fields.permissions !== undefined) this.props.permissions = [...fields.permissions];
    if (fields.status !== undefined) this.props.status = fields.status;
    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Role is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
