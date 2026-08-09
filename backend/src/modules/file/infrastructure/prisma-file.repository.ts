import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IFileRepository } from '../domain/file.repository';
import { FileRecord } from '../domain/file.entity';

@Injectable()
export class PrismaFileRepository implements IFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<FileRecord | null> {
    const record = await this.prisma.fileRecord.findUnique({ where: { id, deletedAt: null } });
    return record ? this.toDomain(record) : null;
  }

  async findByCategory(category: string): Promise<FileRecord[]> {
    const records = await this.prisma.fileRecord.findMany({ where: { category, deletedAt: null }, orderBy: { createdAt: 'desc' } });
    return records.map((r) => this.toDomain(r));
  }

  async findByEntity(entityType: string, entityId: string): Promise<FileRecord[]> {
    const records = await this.prisma.fileRecord.findMany({ where: { entityType, entityId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
    return records.map((r) => this.toDomain(r));
  }

  async findAll(): Promise<FileRecord[]> {
    const records = await this.prisma.fileRecord.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
    return records.map((r) => this.toDomain(r));
  }

  async save(file: FileRecord): Promise<void> {
    const data: any = {
      category: file.category,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      path: file.path,
      entityType: file.entityType ?? null,
      entityId: file.entityId ?? null,
      metadata: file.metadata ?? Prisma.JsonNull,
      uploadedById: file.uploadedById ?? null,
    };
    await this.prisma.fileRecord.upsert({
      where: { id: file.id.toValue() },
      create: { id: file.id.toValue(), ...data },
      update: data,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.fileRecord.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private toDomain(record: any): FileRecord {
    return FileRecord.create(
      {
        category: record.category,
        fileName: record.fileName,
        originalName: record.originalName,
        mimeType: record.mimeType,
        size: record.size,
        path: record.path,
        entityType: record.entityType ?? undefined,
        entityId: record.entityId ?? undefined,
        metadata: record.metadata ?? undefined,
        uploadedById: record.uploadedById ?? undefined,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
