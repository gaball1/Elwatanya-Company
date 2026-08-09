import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Notification, NotificationType } from './notification.entity';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationQuery {
  type?: NotificationType;
  read?: boolean;
}

export interface INotificationRepository {
  save(notification: Notification): Promise<void>;
  findById(id: UniqueEntityId): Promise<Notification | null>;
  findAll(query?: NotificationQuery): Promise<Notification[]>;
  markAllAsRead(): Promise<number>;
  clearAll(): Promise<number>;
}
