import { apiClient } from '@/lib/api/apiClient';
import { getAccessToken } from '@/lib/api/tokenStorage';
import { safeFetch } from '@/lib/api/fetchTransport';

export interface ReportDefinition {
  name: string;
  displayName: string;
  description: string;
  category: string;
  supportedFormats: string[];
  parameterSchema: Record<string, unknown>;
  requiresProject: boolean;
  requiresBuilding: boolean;
}

export const reportsService = {
  async getAvailableReports(): Promise<ReportDefinition[]> {
    const data = await apiClient<{ reports?: ReportDefinition[] }>('/reporting/reports', { method: 'GET' });
    return data?.reports || (Array.isArray(data) ? data : []);
  },

  async generateReport(reportName: string, format: string, params: Record<string, unknown> = {}): Promise<Blob> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const token = getAccessToken() || '';

    const queryParams = new URLSearchParams({ format });
    const url = `${baseUrl}/reporting/${reportName}/generate?${queryParams}`;

    const response = await safeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) throw new Error('Report generation failed');
    return response.blob();
  },

  async previewReport(reportName: string, params: Record<string, unknown> = {}): Promise<string> {
    const queryParams = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null) as [string, string][]
    ).toString();
    const suffix = queryParams ? `?${queryParams}` : '';
    const data = await apiClient<{ html?: string }>(`/reporting/${reportName}/preview${suffix}`, {
      method: 'GET',
    });
    return data?.html ?? '';
  },
};
