import { apiClient } from '@/lib/api/apiClient';

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  message?: string;
  lastChecked: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  components: Record<string, ComponentHealth>;
  uptime: number;
  lastChecked: string;
}

export interface SystemMetrics {
  activeUsers: number;
  totalRequests: number;
  errorRate: number;
  avgResponseTime: number;
  queueDepth: number;
  failedJobs: number;
  storageUsed: number;
  databaseConnections: number;
}

export const monitorService = {
  async health(): Promise<SystemHealth> {
    const data = await apiClient<SystemHealth>('/monitor/health', { method: 'GET' });
    return data;
  },

  async metrics(): Promise<SystemMetrics> {
    const data = await apiClient<SystemMetrics>('/monitor/metrics', { method: 'GET' });
    return data;
  },
};
