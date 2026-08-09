import { apiClient } from '@/lib/api/apiClient';

export interface Leave {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: string;
  approvedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveData {
  employeeId: string;
  leaveType?: string;
  startDate: string;
  endDate: string;
  daysCount?: number;
  reason?: string;
  status?: string;
  approvedBy?: string;
}

export interface UpdateLeaveData {
  employeeId?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  daysCount?: number;
  reason?: string;
  status?: string;
  approvedBy?: string;
}

export const leaveService = {
  async list(): Promise<Leave[]> {
    const data = await apiClient<{ items: Leave[] }>('/leaves', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Leave> {
    const data = await apiClient<{ leave: Leave }>(`/leaves/${id}`, { method: 'GET' });
    return data.leave;
  },
  async create(body: CreateLeaveData): Promise<Leave> {
    const data = await apiClient<{ leave: Leave }>('/leaves', { method: 'POST', body });
    return data.leave;
  },
  async update(id: string, body: UpdateLeaveData): Promise<Leave> {
    const data = await apiClient<{ leave: Leave }>(`/leaves/${id}`, { method: 'PATCH', body });
    return data.leave;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/leaves/${id}`, { method: 'DELETE' });
  },
};
