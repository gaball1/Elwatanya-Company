import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationMessage } from '../../domain/notification-provider.interface';
import { NotificationChannel } from '../../domain/notification-channel.enum';

@Injectable()
export class SmsNotificationProvider implements NotificationProvider {
  readonly name = 'sms';
  readonly channel = NotificationChannel.SMS;
  private readonly logger = new Logger('SmsNotification');

  async send(message: NotificationMessage): Promise<boolean> {
    this.logger.log(`SMS → ${message.recipientAddress}: ${message.body}`);
    return true;
  }
}
