import { apiClient } from '@/lib/api/apiClient';

export interface Project {
  id: string;
  code: string;
  name: string;
  location: string;
  description: string;
  client: string;
  startDate: string | null;
  plannedDurationMonths: number;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  code: string;
  name: string;
  location?: string;
  description?: string;
  client?: string;
  startDate?: string;
  plannedDurationMonths?: number;
  status?: string;
  progress?: number;
}

export interface UpdateProjectData {
  name?: string;
  location?: string;
  description?: string;
  client?: string;
  startDate?: string;
  plannedDurationMonths?: number;
  status?: string;
  progress?: number;
}

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const data = await apiClient<{ items: Project[] }>('/projects', { method: 'GET' });
    return data.items;
  },
  async getProject(id: string): Promise<Project> {
    const data = await apiClient<{ project: Project }>(`/projects/${id}`, { method: 'GET' });
    return data.project;
  },
  async createProject(body: CreateProjectData): Promise<Project> {
    const res = await apiClient<{ project: Project }>('/projects', { method: 'POST', body });
    return res.project;
  },
  async updateProject(id: string, body: UpdateProjectData): Promise<Project> {
    const res = await apiClient<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body });
    return res.project;
  },
  async deleteProject(id: string): Promise<void> {
    await apiClient(`/projects/${id}`, { method: 'DELETE' });
  },
};
