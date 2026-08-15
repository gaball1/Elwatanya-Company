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
  targetRoles: string[];
  targetPermissions: string[];
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
  targetRoles?: string[];
  targetPermissions?: string[];
}

export interface ListNotificationsQuery {
  type?: NotificationType;
  read?: boolean;
  /** Roles held by the requesting user (JWT). */
  roleNames?: string[];
  /** Permissions held by the requesting user (JWT). */
  permissionNames?: string[];
  /** Maximum number of notifications to return. */
  limit?: number;
}
