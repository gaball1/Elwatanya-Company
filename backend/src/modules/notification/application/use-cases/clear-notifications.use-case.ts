import { Result } from '@/shared/kernel/result';
import { INotificationRepository, NotificationQuery } from '../../domain/notification.repository';

export class ClearNotificationsUseCase {
  constructor(private readonly notifications: INotificationRepository) {}

  async execute(
    userId: string,
    isAdmin: boolean,
    scoping?: Pick<NotificationQuery, 'roleNames' | 'permissionNames'>,
  ): Promise<Result<{ count: number }>> {
    const count = await this.notifications.clearAll(userId, isAdmin, scoping);
    return Result.ok({ count });
  }
}
