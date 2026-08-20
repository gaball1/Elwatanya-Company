import { apiClient } from '@/lib/api/apiClient';

export interface TimelineEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  eventCategory: string;
  title: string;
  description: string;
  userId?: string;
  userName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface TimelineLifecycle {
  created: { at: string; by: string } | null;
  lastModified: { at: string; by: string } | null;
  statusChanges: { from: string; to: string; at: string; by: string }[];
  totalEvents: number;
}

export const timelineService = {
  async getTimeline(entityType: string, entityId: string, limit = 50): Promise<TimelineEvent[]> {
    const data = await apiClient<{ events: TimelineEvent[] }>(`/timeline/${entityType}/${entityId}?limit=${limit}`, { method: 'GET' });
    return data.events || [];
  },

  async getLifecycle(entityType: string, entityId: string): Promise<TimelineLifecycle> {
    const data = await apiClient<TimelineLifecycle>(`/timeline/${entityType}/${entityId}/lifecycle`, { method: 'GET' });
    return data;
  },
};
