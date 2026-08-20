import { apiClient } from '@/lib/api/apiClient';

export interface FinanceSettings {
  defaultInsurancePercent: number;
  maxInsurancePercent: number;
  taxRate: number;
  decimalPlaces: number;
}

export interface SettingsMap {
  [key: string]: unknown;
}

export const settingsService = {
  async getFinance(): Promise<FinanceSettings> {
    const data = await apiClient<{ group: string; settings: Record<string, unknown> }>('/settings/finance', { method: 'GET' });
    return {
      defaultInsurancePercent: Number(data.settings?.defaultInsurancePercent ?? 5),
      maxInsurancePercent: Number(data.settings?.maxInsurancePercent ?? 10),
      taxRate: Number(data.settings?.taxRate ?? 0),
      decimalPlaces: Number(data.settings?.decimalPlaces ?? 2),
    };
  },
};
