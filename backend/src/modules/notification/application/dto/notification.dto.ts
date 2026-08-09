import { NotificationType } from '../../domain/notification.entity';

export interface NotificationResult {
  id: string;
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
  type: NotificationType;
  date: Date;
  read: boolean;
  userId: string | null;
  entityType: string | null;
  entityId: string | null;
  link: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationInput {
  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  type?: string;
  date?: Date;
  userId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  link?: string | null;
}

export interface ListNotificationsQuery {
  type?: NotificationType;
  read?: boolean;
}
