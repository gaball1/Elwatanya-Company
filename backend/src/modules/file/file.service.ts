import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IFileRepository, FILE_REPOSITORY } from './domain/file.repository';
import { FileRecord } from './domain/file.entity';
import { FileDto, UploadOptions } from './domain/file.interface';
import { StorageRegistry } from './infrastructure/storage/storage-registry.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { detectMimeType } from '@/common/utils/mime.util';
import {
  isAllowedCategory,
  isAllowedMimeType,
  isAllowedCompanyMimeType,
  MAX_FILE_SIZE_BYTES,
} from './domain/file-security.constants';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @Inject(FILE_REPOSITORY)
    private readonly repository: IFileRepository,
    private readonly storageRegistry: StorageRegistry,
  ) {}

  private assertCategoryAllowed(category: string): void {
    if (!category || !isAllowedCategory(category)) {
      throw new BadRequestException(`Unsupported file category: ${category}`);
    }
  }

  private assertFileAllowed(buffer: Buffer, category: string, fallbackMime: string, fileName: string): string {
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB size limit`);
    }
    if (buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }

    const mimeType = detectMimeType(buffer, fallbackMime, fileName);

    if (!isAllowedMimeType(mimeType)) {
      throw new BadRequestException(`File type not allowed: ${mimeType}`);
    }

    // Company assets are served publicly (no auth) and embedded in PDFs/frontend:
    // only safe raster images may be stored there. SVG/HTML are never allowed.
    if (category === 'company' && !isAllowedCompanyMimeType(mimeType)) {
      throw new BadRequestException(`Company branding only accepts image files (PNG/JPEG/GIF/WebP/BMP)`);
    }

    return mimeType;
  }

  async upload(buffer: Buffer, options: UploadOptions): Promise<FileDto> {
    this.assertCategoryAllowed(options.category);

    const ext = extname(options.fileName);
    const storedName = `${uuid()}${ext}`;
    const path = `${options.category}/${storedName}`;

    const mimeType = this.assertFileAllowed(buffer, options.category, options.mimeType, options.fileName);

    const storage = this.storageRegistry.getActive();
    await storage.save(buffer, path, mimeType);

    const file = FileRecord.create({
      category: options.category,
      fileName: storedName,
      originalName: options.fileName,
      mimeType,
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
    // Records created before magic-byte detection may hold a generic octet-stream
    // type; derive the correct type from the stored extension when serving.
    const mimeType = detectMimeType(Buffer.alloc(0), file.mimeType, file.originalName);
    return { stream, mimeType, fileName: file.originalName };
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
