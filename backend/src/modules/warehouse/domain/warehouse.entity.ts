import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface WarehouseProps {
  code: string;
  name: string;
  location: string;
  status: string;
  deletedAt: Date | null;
}

export class Warehouse extends AggregateRoot {
  private props: WarehouseProps;
  private constructor(props: WarehouseProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get location(): string { return this.props.location; }
  get status(): string { return this.props.status; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: { code: string; name: string; location?: string; status?: string }): Result<Warehouse> {
    const guard = Guard.againstNullOrUndefined(input.code, 'code');
    if (guard.isFailure) return Result.fail(guard.error as Error);
    const guardName = Guard.againstNullOrUndefined(input.name, 'name');
    if (guardName.isFailure) return Result.fail(guardName.error as Error);
    const trimmedCode = input.code.trim();
    if (trimmedCode.length === 0) return Result.fail(new Error('Warehouse code cannot be empty'));
    const trimmedName = input.name.trim();
    if (trimmedName.length === 0) return Result.fail(new Error('Warehouse name cannot be empty'));
    return Result.ok(new Warehouse({ code: trimmedCode, name: trimmedName, location: input.location ?? '', status: input.status ?? 'active', deletedAt: null }));
  }

  public static reconstitute(props: WarehouseProps, id: UniqueEntityId, createdAt: Date, updatedAt: Date): Warehouse {
    return new Warehouse(props, id, createdAt, updatedAt);
  }

  public update(fields: { code?: string; name?: string; location?: string; status?: string }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted warehouse'));
    if (fields.code !== undefined) { const trimmed = fields.code.trim(); if (trimmed.length === 0) return Result.fail(new Error('Code cannot be empty')); this.props.code = trimmed; }
    if (fields.name !== undefined) { const trimmed = fields.name.trim(); if (trimmed.length === 0) return Result.fail(new Error('Name cannot be empty')); this.props.name = trimmed; }
    if (fields.location !== undefined) this.props.location = fields.location;
    if (fields.status !== undefined) this.props.status = fields.status;
    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Warehouse is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
