import { apiClient } from '@/lib/api/apiClient';

export interface Approval {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  requestedBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestApprovalData {
  entityType: string;
  entityId: string;
  comment?: string;
  status?: 'draft' | 'pending';
}

export interface ApproveOrRejectData {
  comment?: string;
}

export const approvalService = {
  async list(params?: { status?: string; entityType?: string; skip?: string; take?: string }): Promise<{ items: Approval[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.entityType) searchParams.set('entityType', params.entityType);
    if (params?.skip) searchParams.set('skip', params.skip);
    if (params?.take) searchParams.set('take', params.take);
    const query = searchParams.toString();
    const data = await apiClient<{ items: Approval[]; total: number }>(`/approvals${query ? `?${query}` : ''}`, { method: 'GET' });
    return { items: data.items, total: data.total };
  },
  async request(body: RequestApprovalData): Promise<Approval> {
    const data = await apiClient<{ approval: Approval }>('/approvals', { method: 'POST', body });
    return data.approval;
  },
  async approve(id: string, body?: ApproveOrRejectData): Promise<Approval> {
    const data = await apiClient<{ approval: Approval }>(`/approvals/${id}/approve`, { method: 'PATCH', body });
    return data.approval;
  },
  async reject(id: string, body?: ApproveOrRejectData): Promise<Approval> {
    const data = await apiClient<{ approval: Approval }>(`/approvals/${id}/reject`, { method: 'PATCH', body });
    return data.approval;
  },
  async submit(id: string, body?: ApproveOrRejectData): Promise<Approval> {
    const data = await apiClient<{ approval: Approval }>(`/approvals/${id}/submit`, { method: 'PATCH', body });
    return data.approval;
  },
  async cancel(id: string, body?: ApproveOrRejectData): Promise<Approval> {
    const data = await apiClient<{ approval: Approval }>(`/approvals/${id}/cancel`, { method: 'PATCH', body });
    return data.approval;
  },
};
