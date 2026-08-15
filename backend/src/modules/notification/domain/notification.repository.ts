import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Notification, NotificationType } from './notification.entity';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationQuery {
  type?: NotificationType;
  read?: boolean;
  userId?: string;
  isAdmin?: boolean;
  /** Role names held by the requesting user (JWT roleNames). Used to scope role-targeted broadcasts. */
  roleNames?: string[];
  /** Permission names held by the requesting user (JWT permissions). Used to scope permission-targeted broadcasts. */
  permissionNames?: string[];
  /** Maximum number of notifications to return. */
  limit?: number;
}

export interface INotificationRepository {
  save(notification: Notification): Promise<void>;
  findById(id: UniqueEntityId): Promise<Notification | null>;
  findAll(query?: NotificationQuery): Promise<Notification[]>;
  countUnread(query?: NotificationQuery): Promise<number>;
  markAllAsRead(userId?: string, isAdmin?: boolean, scoping?: Pick<NotificationQuery, 'roleNames' | 'permissionNames'>): Promise<number>;
  clearAll(userId?: string, isAdmin?: boolean, scoping?: Pick<NotificationQuery, 'roleNames' | 'permissionNames'>): Promise<number>;
}
