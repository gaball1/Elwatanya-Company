import { FileRecord } from './file.entity';

export const FILE_REPOSITORY = Symbol('FILE_REPOSITORY');

export interface IFileRepository {
  findById(id: string): Promise<FileRecord | null>;
  findByCategory(category: string): Promise<FileRecord[]>;
  findByEntity(entityType: string, entityId: string): Promise<FileRecord[]>;
  findAll(): Promise<FileRecord[]>;
  save(file: FileRecord): Promise<void>;
  softDelete(id: string): Promise<void>;
}
