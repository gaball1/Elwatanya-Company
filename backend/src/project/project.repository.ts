import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Project } from '@prisma/client';

@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return this.prisma.project.create({ data });
  }

  async findById(id: string, includeDeleted = false): Promise<Project | null> {
    const where: Prisma.ProjectWhereUniqueInput & Prisma.ProjectWhereInput = { id };
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    return this.prisma.project.findFirst({ where });
  }

  async findAll(includeDeleted = false): Promise<Project[]> {
    const where: Prisma.ProjectWhereInput = {};
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    return this.prisma.project.findMany({ where });
  }

  async update(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return this.prisma.project.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
