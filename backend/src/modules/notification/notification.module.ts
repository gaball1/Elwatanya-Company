import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { NOTIFICATION_REPOSITORY } from './domain/notification.repository';
import { INotificationRepository } from './domain/notification.repository';
import { PrismaNotificationRepository } from './infrastructure/prisma-notification.repository';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
import { CountUnreadNotificationsUseCase } from './application/use-cases/count-unread-notifications.use-case';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case';
import { MarkReadNotificationUseCase } from './application/use-cases/mark-read-notification.use-case';
import { MarkAllReadUseCase } from './application/use-cases/mark-all-read.use-case';
import { ClearNotificationsUseCase } from './application/use-cases/clear-notifications.use-case';
import { DeleteNotificationUseCase } from './application/use-cases/delete-notification.use-case';
import { NotificationController } from './notification.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    {
      provide: ListNotificationsUseCase,
      useFactory: (repo: INotificationRepository) => new ListNotificationsUseCase(repo),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: CountUnreadNotificationsUseCase,
      useFactory: (repo: INotificationRepository) => new CountUnreadNotificationsUseCase(repo),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: CreateNotificationUseCase,
      useFactory: (repo: INotificationRepository) => new CreateNotificationUseCase(repo),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: MarkReadNotificationUseCase,
      useFactory: (repo: INotificationRepository) => new MarkReadNotificationUseCase(repo),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: MarkAllReadUseCase,
      useFactory: (repo: INotificationRepository) => new MarkAllReadUseCase(repo),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: ClearNotificationsUseCase,
      useFactory: (repo: INotificationRepository) => new ClearNotificationsUseCase(repo),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: DeleteNotificationUseCase,
      useFactory: (repo: INotificationRepository) => new DeleteNotificationUseCase(repo),
      inject: [NOTIFICATION_REPOSITORY],
    },
  ],
  exports: [NOTIFICATION_REPOSITORY],
})
export class NotificationModule {}
