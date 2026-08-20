import { apiClient } from '@/lib/api/apiClient';

export interface SetupStatus {
  isComplete: boolean;
  currentStep: string;
  completedSteps: string[];
}

export interface CompanyInfo {
  name: string;
  arabicName: string;
  logo?: string;
  favicon?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  commercialRegister?: string;
  currency?: string;
  dateFormat?: string;
  language?: string;
  timeZone?: string;
}

export interface BrandingSettings {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  watermark?: string;
  qrCodeUrl?: string;
  stampUrl?: string;
  digitalStampUrl?: string;
  signatureUrl?: string;
}

export interface FinanceDefaults {
  defaultInsurancePercent?: number;
  maxInsurancePercent?: number;
  taxRate?: number;
  decimalPlaces?: number;
}

export interface AdminInfo {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface WorkSchedule {
  checkInTime?: string;
  checkOutTime?: string;
  overtimeEnabled?: boolean;
  timezone?: string;
}

export const setupWizardService = {
  async getStatus(): Promise<SetupStatus> {
    const data = await apiClient<SetupStatus>('/setup/status', { method: 'GET' });
    return data;
  },

  async saveCompany(info: CompanyInfo): Promise<{ step: string }> {
    const data = await apiClient<{ step: string }>('/setup/company', { method: 'POST', body: info });
    return data;
  },

  async saveBranding(settings: BrandingSettings): Promise<{ step: string }> {
    const data = await apiClient<{ step: string }>('/setup/branding', { method: 'POST', body: settings });
    return data;
  },

  async saveFinance(defaults: FinanceDefaults): Promise<{ step: string }> {
    const data = await apiClient<{ step: string }>('/setup/finance', { method: 'POST', body: defaults });
    return data;
  },

  async createAdmin(admin: AdminInfo): Promise<{ step: string; userId: string }> {
    const data = await apiClient<{ step: string; userId: string }>('/setup/administrator', { method: 'POST', body: admin });
    return data;
  },

  async saveSchedule(schedule: WorkSchedule): Promise<{ step: string }> {
    const data = await apiClient<{ step: string }>('/setup/schedule', { method: 'POST', body: schedule });
    return data;
  },

  async complete(): Promise<{ message: string; redirect: string }> {
    const data = await apiClient<{ message: string; redirect: string }>('/setup/complete', { method: 'POST' });
    return data;
  },
};
