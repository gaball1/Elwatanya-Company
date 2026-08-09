import { apiClient } from '@/lib/api/apiClient';

export interface Notification {
  id: string;
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
  type: string;
  date: string;
  read: boolean;
  userId: string | null;
  entityType: string | null;
  entityId: string | null;
  link: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationData {
  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  type?: string;
  date?: string;
  read?: boolean;
  userId?: string;
  entityType?: string;
  entityId?: string;
  link?: string;
}

export interface UpdateNotificationData {
  title?: string;
  titleEn?: string;
  message?: string;
  messageEn?: string;
  type?: string;
  date?: string;
  read?: boolean;
}

export const notificationService = {
  async list(): Promise<Notification[]> {
    const data = await apiClient<{ items: Notification[] }>('/notifications', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Notification> {
    const data = await apiClient<{ notification: Notification }>(`/notifications/${id}`, { method: 'GET' });
    return data.notification;
  },
  async create(body: CreateNotificationData): Promise<Notification> {
    const data = await apiClient<{ notification: Notification }>('/notifications', { method: 'POST', body });
    return data.notification;
  },
  async markRead(id: string): Promise<Notification> {
    const data = await apiClient<{ notification: Notification }>(`/notifications/${id}/read`, { method: 'PATCH' });
    return data.notification;
  },
  async markAllRead(): Promise<number> {
    const data = await apiClient<{ count: number }>('/notifications/read-all', { method: 'POST' });
    return data.count;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/notifications/${id}`, { method: 'DELETE' });
  },
};
