import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ProjectBoardDocument } from '../domain/project-board-document.entity';
import { IProjectBoardDocumentRepository } from '../domain/project-board-document.repository';

@Injectable()
export class PrismaProjectBoardDocumentRepository implements IProjectBoardDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(doc: ProjectBoardDocument): Promise<void> {
    const data = {
      boardId: doc.boardId,
      fileId: doc.fileId,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      description: doc.description,
      uploadedBy: doc.uploadedBy,
      deletedAt: doc.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.projectBoardDocument.upsert({
      where: { id: doc.id.toValue() },
      create: {
        id: doc.id.toValue(),
        ...data,
        createdAt: doc.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<ProjectBoardDocument | null> {
    const record = await this.prisma.projectBoardDocument.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAllByBoard(boardId: string): Promise<ProjectBoardDocument[]> {
    const where: any = { deletedAt: null };
    if (boardId) where.boardId = boardId;
    const records = await this.prisma.projectBoardDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async softDelete(doc: ProjectBoardDocument): Promise<void> {
    await this.prisma.projectBoardDocument.update({
      where: { id: doc.id.toValue() },
      data: { deletedAt: doc.deletedAt, updatedAt: new Date() },
    });
  }

  private toDomain(record: {
    id: string;
    boardId: string;
    fileId: string | null;
    fileName: string;
    mimeType: string;
    fileSize: number;
    description: string;
    uploadedBy: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectBoardDocument {
    return ProjectBoardDocument.reconstitute(
      {
        boardId: record.boardId,
        fileId: record.fileId,
        fileName: record.fileName,
        mimeType: record.mimeType,
        fileSize: record.fileSize,
        description: record.description,
        uploadedBy: record.uploadedBy,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}