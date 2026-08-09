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

    const records = await this.prisma.notification.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async markAllAsRead(): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { deletedAt: null, read: false },
      data: { read: true },
    });
    return result.count;
  }

  async clearAll(): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count;
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
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
