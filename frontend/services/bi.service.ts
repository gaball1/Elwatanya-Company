import { apiClient } from '@/lib/api/apiClient';

export interface KpiDefinition {
  key: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  target: number;
}

export interface KpiResult {
  key: string;
  name: string;
  description: string;
  category: string;
  value: number;
  target: number;
  status: 'good' | 'warning' | 'danger';
  unit: string;
  trend: 'up' | 'down' | 'stable';
  percentage: number;
}

export interface ProjectDashboard {
  projectId: string;
  projectName: string;
  kpis: KpiResult[];
  summary: {
    overallScore: number;
    totalKpis: number;
    goodCount: number;
    warningCount: number;
    dangerCount: number;
  };
}

export const biService = {
  async getKpis(): Promise<KpiDefinition[]> {
    const data = await apiClient<{ kpis?: KpiDefinition[] }>('/bi/kpis', { method: 'GET' });
    return data?.kpis || (Array.isArray(data) ? data : []);
  },

  async evaluateKpi(key: string, projectId?: string): Promise<KpiResult> {
    const path = projectId ? `/bi/kpis/${key}?projectId=${projectId}` : `/bi/kpis/${key}`;
    const data = await apiClient<KpiResult | { result?: KpiResult }>(path, { method: 'GET' });
    return "result" in data && data.result ? data.result : (data as KpiResult);
  },

  async evaluateAll(projectId?: string): Promise<KpiResult[]> {
    const data = await apiClient<{ results?: KpiResult[] }>('/bi/evaluate', {
      method: 'POST',
      body: { projectId },
    });
    return data?.results || (Array.isArray(data) ? data : []);
  },

  async getDashboard(projectId: string): Promise<ProjectDashboard> {
    const data = await apiClient<ProjectDashboard | { dashboard?: ProjectDashboard }>(`/bi/dashboard/${projectId}`, { method: 'GET' });
    return "dashboard" in data && data.dashboard ? data.dashboard : (data as ProjectDashboard);
  },
};
