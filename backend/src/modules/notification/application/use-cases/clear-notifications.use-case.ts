import { Result } from '@/shared/kernel/result';
import { INotificationRepository } from '../../domain/notification.repository';

export class ClearNotificationsUseCase {
  constructor(private readonly notifications: INotificationRepository) {}

  async execute(): Promise<Result<{ count: number }>> {
    const count = await this.notifications.clearAll();
    return Result.ok({ count });
  }
}
