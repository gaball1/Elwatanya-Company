import { apiClient } from '@/lib/api/apiClient';

export interface ProjectFund {
  id: string;
  projectId: string;
  initialBalance: number;
  currentBalance: number;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectFundData {
  projectId: string;
  initialBalance: number;
  currentBalance?: number;
}

export interface UpdateProjectFundData {
  initialBalance?: number;
  currentBalance?: number;
}

export const projectFundService = {
  async list(): Promise<ProjectFund[]> {
    const data = await apiClient<{ items: ProjectFund[] }>('/project-funds', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<ProjectFund> {
    const data = await apiClient<{ fund: ProjectFund }>(`/project-funds/${id}`, { method: 'GET' });
    return data.fund;
  },
  async create(body: CreateProjectFundData): Promise<ProjectFund> {
    const data = await apiClient<{ fund: ProjectFund }>('/project-funds', { method: 'POST', body });
    return data.fund;
  },
  async update(id: string, body: UpdateProjectFundData): Promise<ProjectFund> {
    const data = await apiClient<{ fund: ProjectFund }>(`/project-funds/${id}`, { method: 'PATCH', body });
    return data.fund;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/project-funds/${id}`, { method: 'DELETE' });
  },
};
