import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '../domain/building.repository';
import { Building } from '../domain/building.entity';

@Injectable()
export class PrismaBuildingRepository implements IBuildingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(building: Building): Promise<void> {
    const data = {
      projectId: building.projectId.toValue(),
      name: building.name,
      code: building.code,
      type: building.type,
      startDate: building.startDate,
      description: building.description,
      status: building.status,
      latitude: building.latitude,
      longitude: building.longitude,
      allowedRadius: building.allowedRadius,
      deletedAt: building.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.building.upsert({
      where: { id: building.id.toValue() },
      create: {
        id: building.id.toValue(),
        ...data,
        createdAt: building.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Building | null> {
    const record = await this.prisma.building.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByProjectId(projectId: UniqueEntityId): Promise<Building[]> {
    const records = await this.prisma.building.findMany({
      where: { projectId: projectId.toValue(), deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  async findAll(): Promise<Building[]> {
    const records = await this.prisma.building.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  async existsByNameInProject(
    projectId: UniqueEntityId,
    name: string,
    excludeBuildingId?: UniqueEntityId,
  ): Promise<boolean> {
    const where: Prisma.BuildingWhereInput = {
      projectId: projectId.toValue(),
      deletedAt: null,
      name: { equals: name, mode: 'insensitive' },
    };

    if (excludeBuildingId) {
      where.id = { not: excludeBuildingId.toValue() };
    }

    const count = await this.prisma.building.count({ where });
    return count > 0;
  }

  private toDomain(record: {
    id: string;
    projectId: string;
    name: string;
    code: string;
    type: string;
    startDate: Date | null;
    description: string;
    status: string;
    latitude: number | null;
    longitude: number | null;
    allowedRadius: number | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Building {
    return Building.reconstitute(
      {
        projectId: new UniqueEntityId(record.projectId),
        name: record.name,
        code: record.code,
        type: record.type,
        startDate: record.startDate,
        description: record.description,
        status: record.status,
        latitude: record.latitude,
        longitude: record.longitude,
        allowedRadius: record.allowedRadius,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
