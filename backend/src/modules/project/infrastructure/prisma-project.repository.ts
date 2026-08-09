import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IProjectRepository } from '../domain/project.repository';
import { Project } from '../domain/project.entity';
import { ProjectCode } from '../domain/value-objects/project-code.vo';

@Injectable()
export class PrismaProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(project: Project): Promise<void> {
    const data = {
      code: project.code.value,
      name: project.name,
      location: project.location,
      description: project.description,
      client: project.client,
      startDate: project.startDate,
      status: project.status,
      progress: project.progress,
      deletedAt: project.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.project.upsert({
      where: { id: project.id.toValue() },
      create: {
        id: project.id.toValue(),
        ...data,
        createdAt: project.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Project | null> {
    const record = await this.prisma.project.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(code: ProjectCode): Promise<Project | null> {
    const record = await this.prisma.project.findFirst({
      where: { code: code.value, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async existsByCode(code: ProjectCode): Promise<boolean> {
    const count = await this.prisma.project.count({
      where: { code: code.value, deletedAt: null },
    });
    return count > 0;
  }

  async findAll(): Promise<Project[]> {
    const records = await this.prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: {
    id: string;
    code: string;
    name: string;
    location: string;
    description: string;
    client: string;
    startDate: Date | null;
    status: string;
    progress: number;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Project {
    const code = ProjectCode.create(record.code).getValue();
    return Project.reconstitute(
      {
        code,
        name: record.name,
        location: record.location,
        description: record.description,
        client: record.client,
        startDate: record.startDate,
        status: record.status,
        progress: record.progress,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
