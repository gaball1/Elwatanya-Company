import { apiClient } from '@/lib/api/apiClient';

export interface ProjectAccounting {
  projectId: string;
  projectName: string;
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  totalPaymentsReceived: number;
  totalPaymentsMade: number;
  netCashFlow: number;
}

export interface AccountingTotals {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  totalPaymentsReceived: number;
  totalPaymentsMade: number;
  netCashFlow: number;
}

export interface AccountingDashboard {
  projectSummaries: ProjectAccounting[];
  totals: AccountingTotals;
  currency: string;
}

export const accountingService = {
  async getDashboard(): Promise<AccountingDashboard> {
    const data = await apiClient<AccountingDashboard>('/accounting/dashboard', { method: 'GET' });
    return data;
  },
};
