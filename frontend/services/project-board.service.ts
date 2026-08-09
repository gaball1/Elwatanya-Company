import { apiClient } from '@/lib/api/apiClient';

export interface ProjectBoard {
  id: string;
  buildingId: string;
  name: string;
  description: string;
  image: string;
  date: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectBoardData {
  buildingId: string;
  name: string;
  description?: string;
  image?: string;
  date?: string;
  createdBy?: string;
}

export interface UpdateProjectBoardData {
  buildingId?: string;
  name?: string;
  description?: string;
  image?: string;
  date?: string;
  createdBy?: string;
}

export const projectBoardService = {
  async list(): Promise<ProjectBoard[]> {
    const data = await apiClient<{ items: ProjectBoard[] }>('/project-boards', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<ProjectBoard> {
    const data = await apiClient<{ board: ProjectBoard }>(`/project-boards/${id}`, { method: 'GET' });
    return data.board;
  },
  async create(body: CreateProjectBoardData): Promise<ProjectBoard> {
    const data = await apiClient<{ board: ProjectBoard }>('/project-boards', { method: 'POST', body });
    return data.board;
  },
  async update(id: string, body: UpdateProjectBoardData): Promise<ProjectBoard> {
    const data = await apiClient<{ board: ProjectBoard }>(`/project-boards/${id}`, { method: 'PATCH', body });
    return data.board;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/project-boards/${id}`, { method: 'DELETE' });
  },
};
