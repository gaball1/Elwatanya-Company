import { apiClient } from '@/lib/api/apiClient';

export interface AuditLogItem {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogResponse {
  items: AuditLogItem[];
  total: number;
}

export const auditService = {
  async list(params: {
    entity?: string;
    action?: string;
    userId?: string;
    skip?: number;
    take?: number;
  } = {}): Promise<AuditLogResponse> {
    const query = new URLSearchParams();
    if (params.entity) query.set('entity', params.entity);
    if (params.action) query.set('action', params.action);
    if (params.userId) query.set('userId', params.userId);
    if (params.skip !== undefined) query.set('skip', String(params.skip));
    if (params.take !== undefined) query.set('take', String(params.take));
    const qs = query.toString();
    const path = `/audit${qs ? `?${qs}` : ''}`;
    const data = await apiClient<AuditLogResponse>(path, { method: 'GET' });
    return data || { items: [], total: 0 };
  },

  async listByEntity(entity: string, entityId: string): Promise<AuditLogItem[]> {
    const data = await apiClient<{ items?: AuditLogItem[] }>(`/audit/entity?entity=${encodeURIComponent(entity)}&entityId=${encodeURIComponent(entityId)}`, { method: 'GET' });
    return data?.items || (Array.isArray(data) ? data : []);
  },
};
