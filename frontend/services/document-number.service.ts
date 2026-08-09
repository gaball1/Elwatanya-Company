import { apiClient } from '@/lib/api/apiClient';

export interface DocumentNumberConfig {
  documentType: string;
  prefix: string;
  padding: number;
  resetStrategy: 'none' | 'yearly' | 'monthly' | 'daily';
  nextNumber: number;
  lastResetAt?: string;
}

export interface UpdateConfigData {
  prefix?: string;
  padding?: number;
  resetStrategy?: 'none' | 'yearly' | 'monthly' | 'daily';
}

export const documentNumberService = {
  async getConfigs(): Promise<DocumentNumberConfig[]> {
    const data = await apiClient<{ configs?: DocumentNumberConfig[] }>('/document-number/configs', { method: 'GET' });
    return data?.configs || (Array.isArray(data) ? data : []);
  },

  async getConfig(documentType: string): Promise<DocumentNumberConfig> {
    const data = await apiClient<{ config?: DocumentNumberConfig }>(`/document-number/configs/${documentType}`, { method: 'GET' });
    return (data as any)?.config || data;
  },

  async updateConfig(documentType: string, body: UpdateConfigData): Promise<DocumentNumberConfig> {
    const data = await apiClient<{ config?: DocumentNumberConfig }>(`/document-number/configs/${documentType}`, { method: 'PUT', body });
    return (data as any)?.config || data;
  },

  async resetCounter(documentType: string, nextNumber?: number): Promise<DocumentNumberConfig> {
    const data = await apiClient<{ config?: DocumentNumberConfig }>(`/document-number/configs/${documentType}/reset`, {
      method: 'POST',
      body: { nextNumber: nextNumber ?? 1 },
    });
    return (data as any)?.config || data;
  },

  async generate(documentType: string, date?: string): Promise<string> {
    const data = await apiClient<{ number?: string }>('/document-number/generate', {
      method: 'POST',
      body: { documentType, date },
    });
    return (data as any)?.number || (data as any) || '';
  },
};
