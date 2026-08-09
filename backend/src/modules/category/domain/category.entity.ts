import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface CategoryProps {
  code: string;
  name: string;
  description: string;
  parentId: string;
  status: string;
  deletedAt: Date | null;
}

export class Category extends AggregateRoot {
  private props: CategoryProps;

  private constructor(
    props: CategoryProps,
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
  get parentId(): string { return this.props.parentId; }
  get status(): string { return this.props.status; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    code: string;
    name: string;
    description?: string;
    parentId?: string | null;
    status?: string;
  }): Result<Category> {
    const guard = Guard.againstNullOrUndefined(input.code, 'code');
    if (guard.isFailure) return Result.fail(guard.error as Error);

    const nameGuard = Guard.againstNullOrUndefined(input.name, 'name');
    if (nameGuard.isFailure) return Result.fail(nameGuard.error as Error);

    const trimmedCode = input.code.trim();
    const trimmedName = input.name.trim();
    if (trimmedCode.length === 0) return Result.fail(new Error('Category code cannot be empty'));
    if (trimmedName.length === 0) return Result.fail(new Error('Category name cannot be empty'));

    return Result.ok(
      new Category({
        code: trimmedCode,
        name: trimmedName,
        description: input.description ?? '',
        parentId: input.parentId ?? '',
        status: input.status ?? 'active',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: CategoryProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Category {
    return new Category(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    code?: string;
    name?: string;
    description?: string;
    parentId?: string | null;
    status?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted category'));

    if (fields.code !== undefined) {
      const trimmed = fields.code.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Category code cannot be empty'));
      this.props.code = trimmed;
    }
    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Category name cannot be empty'));
      this.props.name = trimmed;
    }
    if (fields.description !== undefined) this.props.description = fields.description;
    if (fields.parentId !== undefined) this.props.parentId = fields.parentId ?? '';
    if (fields.status !== undefined) this.props.status = fields.status;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Category is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
