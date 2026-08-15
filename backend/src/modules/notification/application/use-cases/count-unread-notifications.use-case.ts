import { Result } from '@/shared/kernel/result';
import { INotificationRepository, NotificationQuery } from '../../domain/notification.repository';

export class CountUnreadNotificationsUseCase {
  constructor(private readonly notifications: INotificationRepository) {}

  async execute(
    userId: string,
    isAdmin: boolean,
    scoping?: Pick<NotificationQuery, 'roleNames' | 'permissionNames'>,
  ): Promise<Result<number>> {
    const count = await this.notifications.countUnread({
      userId,
      isAdmin,
      roleNames: scoping?.roleNames,
      permissionNames: scoping?.permissionNames,
    });
    return Result.ok(count);
  }
}
