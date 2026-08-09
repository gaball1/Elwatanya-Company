import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ProjectBoard } from '../domain/project-board.entity';
import { IProjectBoardRepository } from '../domain/project-board.repository';

@Injectable()
export class PrismaProjectBoardRepository implements IProjectBoardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(board: ProjectBoard): Promise<void> {
    const data = {
      buildingId: board.buildingId,
      name: board.name,
      description: board.description,
      image: board.image,
      date: board.date,
      createdBy: board.createdBy,
      deletedAt: board.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.projectBoard.upsert({
      where: { id: board.id.toValue() },
      create: {
        id: board.id.toValue(),
        ...data,
        createdAt: board.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<ProjectBoard | null> {
    const record = await this.prisma.projectBoard.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<ProjectBoard[]> {
    const records = await this.prisma.projectBoard.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    buildingId: string;
    name: string;
    description: string;
    image: string;
    date: Date;
    createdBy: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectBoard {
    return ProjectBoard.reconstitute(
      {
        buildingId: record.buildingId,
        name: record.name,
        description: record.description,
        image: record.image,
        date: record.date,
        createdBy: record.createdBy,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
