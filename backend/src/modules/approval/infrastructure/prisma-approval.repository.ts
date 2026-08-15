import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IApprovalRepository, ApprovalListItem } from '../domain/approval.repository';
import { Approval } from '@prisma/client';

@Injectable()
export class PrismaApprovalRepository implements IApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    status?: string;
    entityType?: string;
    requestedBy?: string;
    skip?: number;
    take?: number;
  }): Promise<ApprovalListItem[]> {
    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.entityType) where.entityType = params.entityType;
    if (params.requestedBy) where.requestedBy = params.requestedBy;
    const items = await this.prisma.approval.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip ?? 0, take: params.take ?? 50 });
    return this.attachUserNames(items);
  }

  /** Attaches requester/approver display names for the UI (no schema relation exists). */
  private async attachUserNames(items: Approval[]): Promise<ApprovalListItem[]> {
    const userIds = Array.from(
      new Set(items.flatMap((a) => [a.requestedBy, a.approvedBy].filter((id): id is string => Boolean(id)))),
    );
    if (userIds.length === 0) return items as ApprovalListItem[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return items.map((a) => ({
      ...a,
      requestedByName: nameById.get(a.requestedBy) ?? '',
      approvedByName: a.approvedBy ? nameById.get(a.approvedBy) ?? '' : undefined,
    })) as unknown as ApprovalListItem[];
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

  async transition(
    id: string,
    fromStatus: string,
    toStatus: string,
    data: { approvedBy?: string; comment?: string; approvedAt?: Date },
  ): Promise<Approval | null> {
    const result = await this.prisma.approval.updateMany({
      where: { id, deletedAt: null, status: fromStatus },
      data: { status: toStatus, ...data },
    });
    if (result.count === 0) return null;
    return this.findById(id);
  }

  async count(params: { status?: string; entityType?: string; requestedBy?: string }): Promise<number> {
    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.entityType) where.entityType = params.entityType;
    if (params.requestedBy) where.requestedBy = params.requestedBy;
    return this.prisma.approval.count({ where });
  }
}
