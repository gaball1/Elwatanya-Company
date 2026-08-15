import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ProjectCode } from './value-objects/project-code.vo';

export interface ProjectProps {
  code: ProjectCode;
  name: string;
  location: string;
  description: string;
  client: string;
  startDate: Date | null;
  plannedDurationMonths: number;
  status: string;
  progress: number;
  deletedAt: Date | null;
}

export class Project extends AggregateRoot {
  private props: ProjectProps;

  private constructor(
    props: ProjectProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get code(): ProjectCode {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get location(): string {
    return this.props.location;
  }

  get description(): string {
    return this.props.description;
  }

  get client(): string {
    return this.props.client;
  }

  get startDate(): Date | null {
    return this.props.startDate;
  }

  get plannedDurationMonths(): number {
    return this.props.plannedDurationMonths;
  }

  get status(): string {
    return this.props.status;
  }

  get progress(): number {
    return this.props.progress;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  public static create(input: {
    code: ProjectCode;
    name: string;
    location?: string;
    description?: string;
    client?: string;
    startDate?: Date | null;
    plannedDurationMonths?: number;
    status?: string;
    progress?: number;
  }): Result<Project> {
    const nameResult = Project.validateName(input.name);
    if (nameResult.isFailure) {
      return Result.fail(nameResult.error as Error);
    }

    return Result.ok(
      new Project({
        code: input.code,
        name: nameResult.getValue(),
        location: input.location ?? '',
        description: input.description ?? '',
        client: input.client ?? '',
        startDate: input.startDate ?? null,
        plannedDurationMonths: input.plannedDurationMonths ?? 24,
        status: input.status ?? 'active',
        progress: input.progress ?? 0,
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: ProjectProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Project {
    return new Project(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    name?: string;
    location?: string;
    description?: string;
    client?: string;
    startDate?: Date | null;
    plannedDurationMonths?: number;
    status?: string;
    progress?: number;
  }): Result<void> {
    if (this.isDeleted) {
      return Result.fail(new Error('Cannot update a deleted project'));
    }

    if (fields.name !== undefined) {
      const nameResult = Project.validateName(fields.name);
      if (nameResult.isFailure) {
        return Result.fail(nameResult.error as Error);
      }
      this.props.name = nameResult.getValue();
    }
    if (fields.location !== undefined) this.props.location = fields.location;
    if (fields.description !== undefined) this.props.description = fields.description;
    if (fields.client !== undefined) this.props.client = fields.client;
    if (fields.startDate !== undefined) this.props.startDate = fields.startDate;
    if (fields.plannedDurationMonths !== undefined) this.props.plannedDurationMonths = fields.plannedDurationMonths;
    if (fields.status !== undefined) this.props.status = fields.status;
    if (fields.progress !== undefined) this.props.progress = fields.progress;

    return Result.ok();
  }

  public rename(name: string): Result<void> {
    if (this.isDeleted) {
      return Result.fail(new Error('Cannot rename a deleted project'));
    }

    const nameResult = Project.validateName(name);
    if (nameResult.isFailure) {
      return Result.fail(nameResult.error as Error);
    }

    this.props.name = nameResult.getValue();
    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) {
      return Result.fail(new Error('Project is already deleted'));
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
      return Result.fail(new Error('Project name cannot be empty'));
    }

    if (trimmed.length > 200) {
      return Result.fail(new Error('Project name must be at most 200 characters'));
    }

    return Result.ok(trimmed);
  }
}
