import { apiClient } from '@/lib/api/apiClient';

export interface ProjectDashboard {
  project: { id: string; name: string; progress: number; status: string; startDate: string | null; plannedDurationMonths: number };
  financials: {
    totalRevenue: number;
    totalCosts: number;
    grossProfit: number;
    paymentsReceived: number;
    paymentsMade: number;
    netCashFlow: number;
  };
  stats: {
    buildingCount: number;
    employeeCount: number;
    extractCount: number;
    pendingApprovals: number;
    pendingStatements: number;
    recentPurchases: number;
  };
  alerts: { type: string; message: string; severity: string }[];
}

export const projectDashboardService = {
  async getDashboard(projectId: string): Promise<ProjectDashboard> {
    const data = await apiClient<ProjectDashboard>(`/projects/${projectId}/dashboard`, { method: 'GET' });
    return data;
  },
};
