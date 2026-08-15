import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface ProjectBoardDocumentProps {
  boardId: string;
  fileId: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  description: string;
  uploadedBy: string | null;
  deletedAt: Date | null;
}

export class ProjectBoardDocument extends AggregateRoot {
  private props: ProjectBoardDocumentProps;

  private constructor(
    props: ProjectBoardDocumentProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get boardId(): string { return this.props.boardId; }
  get fileId(): string | null { return this.props.fileId; }
  get fileName(): string { return this.props.fileName; }
  get mimeType(): string { return this.props.mimeType; }
  get fileSize(): number { return this.props.fileSize; }
  get description(): string { return this.props.description; }
  get uploadedBy(): string | null { return this.props.uploadedBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    boardId: string;
    fileName: string;
    fileId?: string | null;
    mimeType?: string;
    fileSize?: number;
    description?: string;
    uploadedBy?: string | null;
  }): Result<ProjectBoardDocument> {
    const guard1 = Guard.againstNullOrUndefined(input.boardId, 'boardId');
    const guard2 = Guard.againstNullOrUndefined(input.fileName, 'fileName');
    const combined = Guard.combine(guard1, guard2);
    if (combined.isFailure) return Result.fail(combined.error as Error);

    const fileName = input.fileName.trim();
    if (fileName.length === 0) return Result.fail(new Error('File name cannot be empty'));

    return Result.ok(
      new ProjectBoardDocument({
        boardId: input.boardId,
        fileId: input.fileId ?? null,
        fileName,
        mimeType: input.mimeType ?? 'application/octet-stream',
        fileSize: input.fileSize ?? 0,
        description: input.description ?? '',
        uploadedBy: input.uploadedBy ?? null,
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: ProjectBoardDocumentProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): ProjectBoardDocument {
    return new ProjectBoardDocument(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    fileName?: string;
    fileId?: string | null;
    mimeType?: string;
    fileSize?: number;
    description?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted board document'));

    if (fields.fileName !== undefined) {
      const trimmed = fields.fileName.trim();
      if (trimmed.length === 0) return Result.fail(new Error('File name cannot be empty'));
      this.props.fileName = trimmed;
    }
    if (fields.fileId !== undefined) this.props.fileId = fields.fileId;
    if (fields.mimeType !== undefined) this.props.mimeType = fields.mimeType;
    if (fields.fileSize !== undefined) {
      if (fields.fileSize < 0) return Result.fail(new Error('File size cannot be negative'));
      this.props.fileSize = fields.fileSize;
    }
    if (fields.description !== undefined) this.props.description = fields.description;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Board document is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}