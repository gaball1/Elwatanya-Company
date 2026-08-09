export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  components: Record<string, ComponentHealth>;
  uptime: number;
  lastChecked: Date;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  message?: string;
  lastChecked: Date;
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
