import { apiClient } from '@/lib/api/apiClient';

export interface BuildingSubcontractor {
  id: string;
  buildingId: string;
  subcontractorId: string;
  workType: string;
  agreedPrice: number | null;
  status: string;
  assignedAt: string;
  subcontractor: {
    id: string;
    name: string;
    workType: string;
    phone: string;
    email: string;
  };
}

export const buildingSubcontractorService = {
  async listByBuilding(buildingId: string): Promise<BuildingSubcontractor[]> {
    const data = await apiClient<{ items: BuildingSubcontractor[] }>(
      `/buildings/${buildingId}/subcontractors`,
      { method: 'GET' }
    );
    return data.items;
  },
  async assign(
    buildingId: string,
    subcontractorId: string,
    workType?: string,
    agreedPrice?: number
  ): Promise<BuildingSubcontractor> {
    const data = await apiClient<{ item: BuildingSubcontractor }>(
      `/buildings/${buildingId}/subcontractors`,
      { method: 'POST', body: { subcontractorId, workType, agreedPrice } }
    );
    return data.item;
  },
  async remove(buildingId: string, subcontractorId: string): Promise<void> {
    await apiClient(
      `/buildings/${buildingId}/subcontractors/${subcontractorId}`,
      { method: 'DELETE' }
    );
  },
};
