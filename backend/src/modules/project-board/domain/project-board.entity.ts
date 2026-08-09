import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface ProjectBoardProps {
  buildingId: string;
  name: string;
  description: string;
  image: string;
  date: Date;
  createdBy: string;
  deletedAt: Date | null;
}

export class ProjectBoard extends AggregateRoot {
  private props: ProjectBoardProps;

  private constructor(
    props: ProjectBoardProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get buildingId(): string { return this.props.buildingId; }
  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get image(): string { return this.props.image; }
  get date(): Date { return this.props.date; }
  get createdBy(): string { return this.props.createdBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    buildingId: string;
    name: string;
    description?: string;
    image?: string;
    date?: Date;
    createdBy?: string;
  }): Result<ProjectBoard> {
    const guard1 = Guard.againstNullOrUndefined(input.buildingId, 'buildingId');
    const guard2 = Guard.againstNullOrUndefined(input.name, 'name');
    const combined = Guard.combine(guard1, guard2);
    if (combined.isFailure) return Result.fail(combined.error as Error);

    const trimmed = input.name.trim();
    if (trimmed.length === 0) return Result.fail(new Error('Board name cannot be empty'));

    return Result.ok(
      new ProjectBoard({
        buildingId: input.buildingId,
        name: trimmed,
        description: input.description ?? '',
        image: input.image ?? '',
        date: input.date ?? new Date(),
        createdBy: input.createdBy ?? '',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: ProjectBoardProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): ProjectBoard {
    return new ProjectBoard(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    buildingId?: string;
    name?: string;
    description?: string;
    image?: string;
    date?: Date;
    createdBy?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted board'));

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Board name cannot be empty'));
      this.props.name = trimmed;
    }
    if (fields.buildingId !== undefined) this.props.buildingId = fields.buildingId;
    if (fields.description !== undefined) this.props.description = fields.description;
    if (fields.image !== undefined) this.props.image = fields.image;
    if (fields.date !== undefined) this.props.date = fields.date;
    if (fields.createdBy !== undefined) this.props.createdBy = fields.createdBy;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Board is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
