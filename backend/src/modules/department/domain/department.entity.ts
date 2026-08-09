import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface DepartmentProps {
  code: string;
  name: string;
  description: string;
  managerId: string;
  status: string;
  deletedAt: Date | null;
}

export class Department extends AggregateRoot {
  private props: DepartmentProps;

  private constructor(
    props: DepartmentProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get managerId(): string { return this.props.managerId; }
  get status(): string { return this.props.status; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    code: string;
    name: string;
    description?: string;
    managerId?: string;
    status?: string;
  }): Result<Department> {
    const guardCode = Guard.againstNullOrUndefined(input.code, 'code');
    if (guardCode.isFailure) return Result.fail(guardCode.error as Error);

    const guardName = Guard.againstNullOrUndefined(input.name, 'name');
    if (guardName.isFailure) return Result.fail(guardName.error as Error);

    const trimmedCode = input.code.trim();
    if (trimmedCode.length === 0) return Result.fail(new Error('Department code cannot be empty'));

    const trimmedName = input.name.trim();
    if (trimmedName.length === 0) return Result.fail(new Error('Department name cannot be empty'));

    return Result.ok(
      new Department({
        code: trimmedCode,
        name: trimmedName,
        description: input.description ?? '',
        managerId: input.managerId ?? '',
        status: input.status ?? 'active',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: DepartmentProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Department {
    return new Department(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    code?: string;
    name?: string;
    description?: string;
    managerId?: string;
    status?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted department'));

    if (fields.code !== undefined) {
      const trimmed = fields.code.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Department code cannot be empty'));
      this.props.code = trimmed;
    }
    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Department name cannot be empty'));
      this.props.name = trimmed;
    }
    if (fields.description !== undefined) this.props.description = fields.description;
    if (fields.managerId !== undefined) this.props.managerId = fields.managerId;
    if (fields.status !== undefined) this.props.status = fields.status;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Department is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
