import { Result } from '@/shared/kernel/result';
import { Notification } from '../../domain/notification.entity';
import { INotificationRepository, NotificationQuery } from '../../domain/notification.repository';
import { NotificationResult, ListNotificationsQuery } from '../dto/notification.dto';

export function toResult(n: Notification): NotificationResult {
  return {
    id: n.id.toValue(),
    title: n.title,
    titleEn: n.titleEn,
    message: n.message,
    messageEn: n.messageEn,
    type: n.type,
    date: n.date,
    read: n.read,
    userId: n.userId,
    entityType: n.entityType,
    entityId: n.entityId,
    link: n.link,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

export class ListNotificationsUseCase {
  constructor(private readonly notifications: INotificationRepository) {}

  async execute(query?: ListNotificationsQuery): Promise<Result<NotificationResult[]>> {
    const q: NotificationQuery = {};
    if (query?.type) q.type = query.type;
    if (query?.read !== undefined) q.read = query.read;

    const list = await this.notifications.findAll(query ? q : undefined);
    return Result.ok(list.map(toResult));
  }
}
