import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    before?: any;
    after?: any;
    metadata?: any;
    ip?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          before: params.before ?? undefined,
          after: params.after ?? undefined,
          metadata: params.metadata ?? undefined,
          ip: params.ip ?? undefined,
        },
      });
    } catch {
      // Audit failure must never break the main flow
    }
  }

  async findByEntity(entity: string, entityId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByUser(userId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Resolve a user search term (email, name, or UUID) to matching user IDs.
   */
  private async resolveUserIds(search: string): Promise<string[] | null> {
    const trimmed = search.trim();
    if (!trimmed) return null;

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: trimmed, mode: 'insensitive' } },
          { name: { contains: trimmed, mode: 'insensitive' } },
          { id: trimmed },
        ],
      },
      select: { id: true },
      take: 20,
    });

    return users.length > 0 ? users.map((u) => u.id) : [];
  }

  async findAll(params: { entity?: string; action?: string; userId?: string; skip?: number; take?: number }) {
    const where: any = {};
    if (params.entity) where.entity = params.entity;
    if (params.action) where.action = params.action;
    if (params.userId) {
      const ids = await this.resolveUserIds(params.userId);
      if (ids !== null) {
        if (ids.length === 0) {
          return { items: [], total: 0 };
        }
        where.userId = ids.length === 1 ? ids[0] : { in: ids };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip ?? 0,
        take: params.take ?? 50,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}
