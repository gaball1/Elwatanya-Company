import { apiClient } from '@/lib/api/apiClient';

export interface SignatureWorkflow {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  isActive: boolean;
  steps: any[];
  createdAt: string;
}

export interface SignatureRequest {
  id: string;
  workflowId: string;
  entityType: string;
  entityId: string;
  status: string;
  currentStep: number;
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  actions: any[];
}

export const signatureWorkflowService = {
  async listWorkflows(entityType?: string): Promise<SignatureWorkflow[]> {
    const path = entityType ? `/signature-workflow/workflows?entityType=${entityType}` : '/signature-workflow/workflows';
    const data = await apiClient<any>(path, { method: 'GET' });
    return data?.workflows || data || [];
  },

  async getWorkflow(id: string): Promise<SignatureWorkflow> {
    return apiClient<SignatureWorkflow>(`/signature-workflow/workflows/${id}`, { method: 'GET' });
  },

  async createWorkflow(body: { name: string; description?: string; entityType: string; steps: any[] }): Promise<SignatureWorkflow> {
    return apiClient<SignatureWorkflow>('/signature-workflow/workflows', { method: 'POST', body });
  },

  async deleteWorkflow(id: string): Promise<void> {
    await apiClient(`/signature-workflow/workflows/${id}`, { method: 'DELETE' });
  },

  async getPending(): Promise<SignatureRequest[]> {
    const data = await apiClient<any>('/signature-workflow/pending', { method: 'GET' });
    return data?.requests || data || [];
  },

  async submit(entityType: string, entityId: string, workflowId: string): Promise<SignatureRequest> {
    return apiClient<SignatureRequest>('/signature-workflow/submit', {
      method: 'POST',
      body: { workflowId, entityType, entityId },
    });
  },

  async sign(requestId: string, status: 'signed' | 'rejected', comment?: string, imageUrl?: string): Promise<any> {
    return apiClient(`/signature-workflow/requests/${requestId}/sign`, {
      method: 'POST',
      body: { status, comment, imageUrl },
    });
  },

  async getStatus(entityType: string, entityId: string): Promise<SignatureRequest | null> {
    try {
      const data = await apiClient<any>(`/signature-workflow/status/${entityType}/${entityId}`, { method: 'GET' });
      return data?.request || data || null;
    } catch {
      return null;
    }
  },
};
