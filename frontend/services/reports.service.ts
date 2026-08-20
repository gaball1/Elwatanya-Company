import { apiClient } from '@/lib/api/apiClient';
import { attachAuthHeader } from '@/lib/api/authInterceptor';
import { API_BASE_URL } from '@/lib/api/env';
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

function buildReportUrl(path: string, query?: Record<string, string>): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  let url = `${base}/reporting/${path}`;
  if (query) {
    const qs = new URLSearchParams(query).toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

export const reportsService = {
  async getAvailableReports(): Promise<ReportDefinition[]> {
    const data = await apiClient<{ reports?: ReportDefinition[] }>('/reporting/reports', { method: 'GET' });
    return data?.reports || (Array.isArray(data) ? data : []);
  },

  async generateReport(reportName: string, format: string, params: Record<string, unknown> = {}): Promise<Blob> {
    const url = buildReportUrl(`${reportName}/generate`, { format });
    const headers = attachAuthHeader({ 'Content-Type': 'application/json' });

    const response = await safeFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `Report generation failed (${response.status})`);
    }
    return response.blob();
  },

  async previewReport(reportName: string, params: Record<string, unknown> = {}): Promise<string> {
    const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '') as [string, string][];
    const suffix = filtered.length > 0 ? `?${new URLSearchParams(filtered).toString()}` : '';
    const data = await apiClient<{ html?: string }>(`/reporting/${reportName}/preview${suffix}`, {
      method: 'GET',
    });
    return data?.html ?? '';
  },
};
