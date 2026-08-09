import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IApprovalRepository } from '../domain/approval.repository';
import { Approval } from '@prisma/client';

@Injectable()
export class PrismaApprovalRepository implements IApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    status?: string;
    entityType?: string;
    skip?: number;
    take?: number;
  }): Promise<Approval[]> {
    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.entityType) where.entityType = params.entityType;
    return this.prisma.approval.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip ?? 0, take: params.take ?? 50 });
  }

  async findById(id: string): Promise<Approval | null> {
    return this.prisma.approval.findFirst({ where: { id, deletedAt: null } });
  }

  async findByEntity(entityType: string, entityId: string): Promise<Approval | null> {
    return this.prisma.approval.findFirst({ where: { entityType, entityId, deletedAt: null } });
  }

  async create(data: {
    entityType: string;
    entityId: string;
    requestedBy: string;
    comment?: string;
    status?: string;
  }): Promise<Approval> {
    return this.prisma.approval.create({ data: { entityType: data.entityType, entityId: data.entityId, requestedBy: data.requestedBy, comment: data.comment ?? '', status: data.status ?? 'pending' } });
  }

  async reset(data: {
    id: string;
    requestedBy: string;
    comment?: string;
    status?: string;
  }): Promise<Approval> {
    return this.prisma.approval.update({
      where: { id: data.id },
      data: {
        requestedBy: data.requestedBy,
        comment: data.comment ?? '',
        status: data.status ?? 'pending',
        approvedBy: null,
        approvedAt: null,
      },
    });
  }

  async update(
    id: string,
    data: { status: string; approvedBy?: string; comment?: string; approvedAt?: Date },
  ): Promise<Approval> {
    return this.prisma.approval.update({ where: { id }, data });
  }

  async count(params: { status?: string; entityType?: string }): Promise<number> {
    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.entityType) where.entityType = params.entityType;
    return this.prisma.approval.count({ where });
  }
}
