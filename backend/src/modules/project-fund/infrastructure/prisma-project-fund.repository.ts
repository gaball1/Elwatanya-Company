import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ProjectFund } from '../domain/project-fund.entity';
import { IProjectFundRepository } from '../domain/project-fund.repository';

@Injectable()
export class PrismaProjectFundRepository implements IProjectFundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(fund: ProjectFund): Promise<void> {
    const data = {
      projectId: fund.projectId,
      initialBalance: fund.initialBalance,
      currentBalance: fund.currentBalance,
      pettyCashBalance: fund.pettyCashBalance,
      lastUpdated: fund.lastUpdated,
      deletedAt: fund.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.projectFund.upsert({
      where: { id: fund.id.toValue() },
      create: {
        id: fund.id.toValue(),
        ...data,
        createdAt: fund.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<ProjectFund | null> {
    const record = await this.prisma.projectFund.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByProjectId(projectId: string): Promise<ProjectFund | null> {
    const record = await this.prisma.projectFund.findFirst({
      where: { projectId, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findDeletedByProjectId(projectId: string): Promise<ProjectFund | null> {
    const record = await this.prisma.projectFund.findFirst({
      where: { projectId, deletedAt: { not: null } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<ProjectFund[]> {
    const records = await this.prisma.projectFund.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    projectId: string;
    initialBalance: { toNumber: () => number };
    currentBalance: { toNumber: () => number };
    pettyCashBalance: { toNumber: () => number };
    lastUpdated: Date;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectFund {
    return ProjectFund.reconstitute(
      {
        projectId: record.projectId,
        initialBalance: record.initialBalance.toNumber(),
        currentBalance: record.currentBalance.toNumber(),
        pettyCashBalance: record.pettyCashBalance.toNumber(),
        lastUpdated: record.lastUpdated,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
