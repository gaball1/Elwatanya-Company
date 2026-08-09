import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IFileRepository, FILE_REPOSITORY } from './domain/file.repository';
import { FileRecord } from './domain/file.entity';
import { FileDto, UploadOptions } from './domain/file.interface';
import { StorageRegistry } from './infrastructure/storage/storage-registry.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @Inject(FILE_REPOSITORY)
    private readonly repository: IFileRepository,
    private readonly storageRegistry: StorageRegistry,
  ) {}

  async upload(buffer: Buffer, options: UploadOptions): Promise<FileDto> {
    const ext = extname(options.fileName);
    const storedName = `${uuid()}${ext}`;
    const path = `${options.category}/${storedName}`;

    const storage = this.storageRegistry.getActive();
    await storage.save(buffer, path, options.mimeType);

    const file = FileRecord.create({
      category: options.category,
      fileName: storedName,
      originalName: options.fileName,
      mimeType: options.mimeType,
      size: buffer.length,
      path,
      entityType: options.entityType,
      entityId: options.entityId,
      metadata: options.metadata,
    });

    await this.repository.save(file);
    return this.toDto(file, storage.getUrl(file.id.toValue(), path));
  }

  async uploadBase64(base64: string, options: UploadOptions): Promise<FileDto> {
    const buffer = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    return this.upload(buffer, options);
  }

  async getFile(fileId: string): Promise<FileRecord> {
    const file = await this.repository.findById(fileId);
    if (!file) throw new Error(`File not found: ${fileId}`);
    return file;
  }

  async getFileStream(fileId: string): Promise<{ stream: any; mimeType: string; fileName: string }> {
    const file = await this.getFile(fileId);
    const storage = this.storageRegistry.getActive();
    const stream = await storage.read(file.path);
    return { stream, mimeType: file.mimeType, fileName: file.originalName };
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = await this.getFile(fileId);
    const storage = this.storageRegistry.getActive();
    await storage.delete(file.path);
    await this.repository.softDelete(fileId);
  }

  async listByCategory(category: string): Promise<FileDto[]> {
    const files = await this.repository.findByCategory(category);
    return files.map((f) => this.toDto(f));
  }

  async listByEntity(entityType: string, entityId: string): Promise<FileDto[]> {
    const files = await this.repository.findByEntity(entityType, entityId);
    return files.map((f) => this.toDto(f));
  }

  private toDto(file: FileRecord, url?: string): FileDto {
    return {
      id: file.id.toValue(),
      category: file.category,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      url: url ?? '',
      entityType: file.entityType,
      entityId: file.entityId,
      metadata: file.metadata,
      uploadedById: file.uploadedById,
      createdAt: file.createdAt,
    };
  }
}
