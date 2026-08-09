import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface BuildingProps {
  projectId: UniqueEntityId;
  name: string;
  code: string;
  type: string;
  startDate: Date | null;
  description: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  allowedRadius: number | null;
  deletedAt: Date | null;
}

export class Building extends AggregateRoot {
  private props: BuildingProps;

  private constructor(
    props: BuildingProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get projectId(): UniqueEntityId {
    return this.props.projectId;
  }

  get name(): string {
    return this.props.name;
  }

  get code(): string {
    return this.props.code;
  }

  get type(): string {
    return this.props.type;
  }

  get startDate(): Date | null {
    return this.props.startDate;
  }

  get description(): string {
    return this.props.description;
  }

  get status(): string {
    return this.props.status;
  }

  get latitude(): number | null {
    return this.props.latitude;
  }

  get longitude(): number | null {
    return this.props.longitude;
  }

  get allowedRadius(): number | null {
    return this.props.allowedRadius;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  public static create(input: {
    projectId: UniqueEntityId;
    name: string;
    code?: string;
    type?: string;
    startDate?: Date | null;
    description?: string;
    status?: string;
    latitude?: number | null;
    longitude?: number | null;
    allowedRadius?: number | null;
  }): Result<Building> {
    const nameResult = Building.validateName(input.name);
    if (nameResult.isFailure) {
      return Result.fail(nameResult.error as Error);
    }

    return Result.ok(
      new Building({
        projectId: input.projectId,
        name: nameResult.getValue(),
        code: input.code ?? '',
        type: input.type ?? '',
        startDate: input.startDate ?? null,
        description: input.description ?? '',
        status: input.status ?? 'active',
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        allowedRadius: input.allowedRadius ?? null,
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: BuildingProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Building {
    return new Building(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    name?: string;
    code?: string;
    type?: string;
    startDate?: Date | null;
    description?: string;
    status?: string;
    latitude?: number | null;
    longitude?: number | null;
    allowedRadius?: number | null;
  }): Result<void> {
    if (this.isDeleted) {
      return Result.fail(new Error('Cannot update a deleted building'));
    }

    if (fields.name !== undefined) {
      const nameResult = Building.validateName(fields.name);
      if (nameResult.isFailure) {
        return Result.fail(nameResult.error as Error);
      }
      this.props.name = nameResult.getValue();
    }
    if (fields.code !== undefined) this.props.code = fields.code;
    if (fields.type !== undefined) this.props.type = fields.type;
    if (fields.startDate !== undefined) this.props.startDate = fields.startDate;
    if (fields.description !== undefined) this.props.description = fields.description;
    if (fields.status !== undefined) this.props.status = fields.status;
    if (fields.latitude !== undefined) this.props.latitude = fields.latitude;
    if (fields.longitude !== undefined) this.props.longitude = fields.longitude;
    if (fields.allowedRadius !== undefined) this.props.allowedRadius = fields.allowedRadius;

    return Result.ok();
  }

  public rename(name: string): Result<void> {
    if (this.isDeleted) {
      return Result.fail(new Error('Cannot rename a deleted building'));
    }

    const nameResult = Building.validateName(name);
    if (nameResult.isFailure) {
      return Result.fail(nameResult.error as Error);
    }

    this.props.name = nameResult.getValue();
    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) {
      return Result.fail(new Error('Building is already deleted'));
    }

    this.props.deletedAt = new Date();
    return Result.ok();
  }

  private static validateName(name: string): Result<string> {
    const guard = Guard.againstNullOrUndefined(name, 'name');
    if (guard.isFailure) {
      return Result.fail(guard.error as Error);
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return Result.fail(new Error('Building name cannot be empty'));
    }

    if (trimmed.length > 200) {
      return Result.fail(new Error('Building name must be at most 200 characters'));
    }

    return Result.ok(trimmed);
  }
}
