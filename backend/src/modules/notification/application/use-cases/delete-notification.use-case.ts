import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { INotificationRepository } from '../../domain/notification.repository';

export class DeleteNotificationUseCase {
  constructor(private readonly notifications: INotificationRepository) {}

  async execute(
    id: string,
    userId: string,
    isAdmin: boolean,
    roleNames: string[] = [],
    permissionNames: string[] = [],
  ): Promise<Result<void>> {
    const notification = await this.notifications.findById(new UniqueEntityId(id));
    if (!notification) return Result.fail(new Error('Notification not found'));
    if (!isAdmin) {
      if (!notification.isVisibleTo(roleNames, permissionNames, userId)) {
        return Result.fail(new Error('Notification not found'));
      }
    }

    const deleteResult = notification.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.notifications.save(notification);
    return Result.ok();
  }
}
