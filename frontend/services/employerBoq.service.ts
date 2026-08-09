import { apiClient } from '@/lib/api/apiClient';
import type { EmployerBoqItem } from '@/types/boq';

export type UpsertEmployerBoqItemDto = {
  itemCode?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export const employerBoqService = {
  async list(buildingId: string): Promise<EmployerBoqItem[]> {
    const data = await apiClient<{ items: EmployerBoqItem[] }>(
      `/buildings/${buildingId}/boq/employer`,
      { method: 'GET' }
    );
    return data.items;
  },

  async upsert(
    buildingId: string,
    item: UpsertEmployerBoqItemDto
  ): Promise<EmployerBoqItem> {
    const data = await apiClient<{ item: EmployerBoqItem }>(
      `/buildings/${buildingId}/boq/employer/items`,
      { method: 'POST', body: item }
    );
    return data.item;
  },

  async remove(buildingId: string, itemCode: string): Promise<void> {
    await apiClient<void>(
      `/buildings/${buildingId}/boq/employer/items/${encodeURIComponent(itemCode)}`,
      { method: 'DELETE' }
    );
  },

  async replaceAll(buildingId: string, items: EmployerBoqItem[]): Promise<EmployerBoqItem[]> {
    const data = await apiClient<{ items: EmployerBoqItem[] }>(
      `/buildings/${buildingId}/boq/employer`,
      { method: 'PUT', body: { items } }
    );
    return data.items;
  },
};
