import { Result } from '@/shared/kernel/result';
import { INotificationRepository } from '../../domain/notification.repository';
import { CreateNotificationInput, NotificationResult } from '../dto/notification.dto';
import { Notification } from '../../domain/notification.entity';
import { toResult } from './list-notifications.use-case';

export class CreateNotificationUseCase {
  constructor(private readonly notifications: INotificationRepository) {}

  async execute(input: CreateNotificationInput): Promise<Result<NotificationResult>> {
    const result = Notification.create({
      title: input.title,
      titleEn: input.titleEn,
      message: input.message,
      messageEn: input.messageEn,
      type: input.type,
      date: input.date,
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      link: input.link,
      targetRoles: input.targetRoles,
      targetPermissions: input.targetPermissions,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const notification = result.getValue();
    await this.notifications.save(notification);
    return Result.ok(toResult(notification));
  }
}
