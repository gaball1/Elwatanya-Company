import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationChannel } from '../../domain/notification-channel.enum';
import { NotificationProvider, NotificationMessage } from '../../domain/notification-provider.interface';

@Injectable()
export class InAppNotificationProvider implements NotificationProvider {
  readonly name = 'in-app';
  readonly channel = NotificationChannel.IN_APP;

  constructor(private readonly prisma: PrismaService) {}

  async send(message: NotificationMessage): Promise<boolean> {
    await this.prisma.notification.create({
      data: {
        userId: message.recipientId,
        title: message.title,
        titleEn: message.titleEn,
        message: message.body,
        messageEn: message.bodyEn,
        type: message.priority === 'high' ? 'warning' : 'info',
        entityType: message.data?.entityType as string ?? undefined,
        entityId: message.data?.entityId as string ?? undefined,
        link: message.data?.link as string ?? undefined,
        createdBy: 'system',
      },
    });
    return true;
  }
}
