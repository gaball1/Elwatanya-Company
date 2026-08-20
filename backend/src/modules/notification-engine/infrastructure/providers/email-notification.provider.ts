import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationMessage } from '../../domain/notification-provider.interface';
import { NotificationChannel } from '../../domain/notification-channel.enum';

@Injectable()
export class EmailNotificationProvider implements NotificationProvider {
  readonly name = 'email';
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger('EmailNotification');

  async send(message: NotificationMessage): Promise<boolean> {
    this.logger.log(`EMAIL → ${message.recipientAddress}: ${message.title}`);
    this.logger.log(`   Body: ${message.body}`);
    return true;
  }
}
