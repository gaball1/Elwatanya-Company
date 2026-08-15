import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Notification, NotificationType } from '../domain/notification.entity';
import { INotificationRepository, NotificationQuery } from '../domain/notification.repository';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(notification: Notification): Promise<void> {
    const data = {
      title: notification.title,
      titleEn: notification.titleEn,
      message: notification.message,
      messageEn: notification.messageEn,
      type: notification.type,
      date: notification.date,
      read: notification.read,
      userId: notification.userId,
      entityType: notification.entityType,
      entityId: notification.entityId,
      link: notification.link,
      targetRoles: notification.targetRoles,
      targetPermissions: notification.targetPermissions,
      deletedAt: notification.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.notification.upsert({
      where: { id: notification.id.toValue() },
      create: {
        id: notification.id.toValue(),
        ...data,
        createdAt: notification.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Notification | null> {
    const record = await this.prisma.notification.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(query?: NotificationQuery): Promise<Notification[]> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (query?.type) {
      where.type = query.type;
    }
    if (query?.read !== undefined) {
      where.read = query.read;
    }
    if (!query?.isAdmin) {
      // Non-admin users see only what is dedicated to them:
      //  - their own personal notifications,
      //  - plain broadcasts (no role/permission targeting),
      //  - role-targeted broadcasts matching one of their roles,
      //  - permission-targeted broadcasts matching one of their permissions.
      where.OR = this.scopedWhere(query);
    }
    // Admins see every notification in the system.

    const records = await this.prisma.notification.findMany({
      where,
      orderBy: { date: 'desc' },
      take: query?.limit,
    });
    return records.map((r) => this.toDomain(r));
  }

  async countUnread(query?: NotificationQuery): Promise<number> {
    const where: Record<string, unknown> = { deletedAt: null, read: false };

    if (!query?.isAdmin) {
      where.OR = this.scopedWhere(query);
    }

    return this.prisma.notification.count({ where });
  }

  async markAllAsRead(
    userId?: string,
    isAdmin?: boolean,
    scoping?: Pick<NotificationQuery, 'roleNames' | 'permissionNames'>,
  ): Promise<number> {
    const where: Record<string, unknown> = { deletedAt: null, read: false };
    if (!isAdmin) {
      where.OR = this.scopedWhere({ userId, isAdmin, ...scoping });
    }

    const result = await this.prisma.notification.updateMany({
      where,
      data: { read: true },
    });
    return result.count;
  }

  async clearAll(
    userId?: string,
    isAdmin?: boolean,
    scoping?: Pick<NotificationQuery, 'roleNames' | 'permissionNames'>,
  ): Promise<number> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (!isAdmin) {
      where.OR = this.scopedWhere({ userId, isAdmin, ...scoping });
    }

    const result = await this.prisma.notification.updateMany({
      where,
      data: { deletedAt: new Date() },
    });
    return result.count;
  }

  /** Builds the non-admin visibility OR-clause using the requesting user's roles and permissions. */
  private scopedWhere(query?: NotificationQuery): Record<string, unknown>[] {
    const userId = query?.userId;
    const roleNames = query?.roleNames ?? [];
    const permissionNames = query?.permissionNames ?? [];

    const or: Record<string, unknown>[] = [];
    if (userId) or.push({ userId });
    or.push({
      userId: null,
      targetRoles: { isEmpty: true },
      targetPermissions: { isEmpty: true },
    });
    if (roleNames.length > 0) {
      or.push({ userId: null, targetRoles: { hasSome: roleNames } });
    }
    if (permissionNames.length > 0) {
      or.push({ userId: null, targetPermissions: { hasSome: permissionNames } });
    }
    return or;
  }

  private toDomain(record: {
    id: string;
    title: string;
    titleEn: string;
    message: string;
    messageEn: string;
    type: string;
    date: Date;
    read: boolean;
    userId: string | null;
    entityType: string | null;
    entityId: string | null;
    link: string | null;
    targetRoles: string[];
    targetPermissions: string[];
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Notification {
    return Notification.reconstitute(
      {
        title: record.title,
        titleEn: record.titleEn,
        message: record.message,
        messageEn: record.messageEn,
        type: record.type as NotificationType,
        date: record.date,
        read: record.read,
        userId: record.userId,
        entityType: record.entityType,
        entityId: record.entityId,
        link: record.link,
        targetRoles: record.targetRoles ?? [],
        targetPermissions: record.targetPermissions ?? [],
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
