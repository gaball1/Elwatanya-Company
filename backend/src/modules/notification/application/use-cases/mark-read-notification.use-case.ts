import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { INotificationRepository } from '../../domain/notification.repository';
import { NotificationResult } from '../dto/notification.dto';
import { toResult } from './list-notifications.use-case';

export class MarkReadNotificationUseCase {
  constructor(private readonly notifications: INotificationRepository) {}

  async execute(
    id: string,
    userId: string,
    isAdmin: boolean,
    roleNames: string[] = [],
    permissionNames: string[] = [],
  ): Promise<Result<NotificationResult>> {
    const notification = await this.notifications.findById(new UniqueEntityId(id));
    if (!notification) return Result.fail(new Error('Notification not found'));
    if (!isAdmin) {
      if (!notification.isVisibleTo(roleNames, permissionNames, userId)) {
        return Result.fail(new Error('Notification not found'));
      }
    }

    const markResult = notification.markAsRead();
    if (markResult.isFailure) return Result.fail(markResult.error as Error);

    await this.notifications.save(notification);
    return Result.ok(toResult(notification));
  }
}
