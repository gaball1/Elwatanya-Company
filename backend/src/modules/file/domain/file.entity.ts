import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface FileRecordProps {
  category: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  uploadedById?: string;
}

export class FileRecord extends AggregateRoot {
  private props: FileRecordProps;

  private constructor(props: FileRecordProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get category(): string { return this.props.category; }
  get fileName(): string { return this.props.fileName; }
  get originalName(): string { return this.props.originalName; }
  get mimeType(): string { return this.props.mimeType; }
  get size(): number { return this.props.size; }
  get path(): string { return this.props.path; }
  get entityType(): string | undefined { return this.props.entityType; }
  get entityId(): string | undefined { return this.props.entityId; }
  get metadata(): Record<string, any> | undefined { return this.props.metadata; }
  get uploadedById(): string | undefined { return this.props.uploadedById; }

  static create(props: FileRecordProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date): FileRecord {
    return new FileRecord(props, id, createdAt, updatedAt);
  }
}
