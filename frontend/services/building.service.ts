import { apiClient } from '@/lib/api/apiClient';

export interface Building {
  id: string;
  projectId: string;
  name: string;
  code: string;
  type: string;
  startDate: string | null;
  description: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  allowedRadius: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBuildingData {
  name: string;
  code?: string;
  type?: string;
  startDate?: string;
  description?: string;
  status?: string;
}

export interface UpdateBuildingData {
  name?: string;
  code?: string;
  type?: string;
  startDate?: string;
  description?: string;
  status?: string;
}

export const buildingService = {
  async list(): Promise<Building[]> {
    const data = await apiClient<{ items: Building[] }>('/buildings', { method: 'GET' });
    return data.items;
  },
  async getBuildings(projectId: string): Promise<Building[]> {
    const data = await apiClient<{ buildings: Building[] }>(`/projects/${projectId}/buildings`, { method: 'GET' });
    return data.buildings;
  },
  async getBuilding(id: string): Promise<Building> {
    const res = await apiClient<{ building: Building }>(`/buildings/${id}`, { method: 'GET' });
    return res.building;
  },
  async createBuilding(projectId: string, body: CreateBuildingData): Promise<Building> {
    const res = await apiClient<{ building: Building }>(`/projects/${projectId}/buildings`, { method: 'POST', body });
    return res.building;
  },
  async updateBuilding(id: string, body: UpdateBuildingData): Promise<Building> {
    const res = await apiClient<{ building: Building }>(`/buildings/${id}`, { method: 'PATCH', body });
    return res.building;
  },
  async deleteBuilding(id: string): Promise<void> {
    await apiClient(`/buildings/${id}`, { method: 'DELETE' });
  }
};
