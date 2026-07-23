import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface BuildingProps {
  projectId: UniqueEntityId;
  name: string;
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

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  public static create(input: {
    projectId: UniqueEntityId;
    name: string;
  }): Result<Building> {
    const nameResult = Building.validateName(input.name);
    if (nameResult.isFailure) {
      return Result.fail(nameResult.error as Error);
    }

    return Result.ok(
      new Building({
        projectId: input.projectId,
        name: nameResult.getValue(),
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
