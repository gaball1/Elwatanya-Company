import { NotificationChannel } from './notification-channel.enum';

export interface NotificationMessage {
  id: string;
  channel: NotificationChannel;
  recipientId: string;
  recipientAddress: string;
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  scheduledAt?: Date;
}

export interface NotificationProvider {
  readonly name: string;
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<boolean>;
}

export interface NotificationTemplate {
  id: string;
  channel: NotificationChannel;
  eventName: string;
  subjectTemplate: string;
  subjectTemplateEn: string;
  bodyTemplate: string;
  bodyTemplateEn: string;
  variables: string[];
}
