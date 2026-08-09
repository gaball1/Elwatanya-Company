import { apiClient } from '@/lib/api/apiClient';
import type { AnalyticalBoqItem } from '@/types/boq';

export const analyticalBoqService = {
  async list(buildingId: string): Promise<AnalyticalBoqItem[]> {
    const data = await apiClient<{ items: AnalyticalBoqItem[] }>(
      `/buildings/${buildingId}/boq/analytical`,
      { method: 'GET' }
    );
    return data.items;
  },

  async replaceAll(buildingId: string, items: AnalyticalBoqItem[]): Promise<AnalyticalBoqItem[]> {
    const data = await apiClient<{ items: AnalyticalBoqItem[] }>(
      `/buildings/${buildingId}/boq/analytical`,
      { method: 'PUT', body: { items } }
    );
    return data.items;
  },

  async update(
    buildingId: string,
    itemCode: string,
    payload: { description: string; quantity: number; unitPrice: number }
  ): Promise<AnalyticalBoqItem> {
    const res = await apiClient<{ item: AnalyticalBoqItem }>(
      `/buildings/${buildingId}/boq/analytical/items/${itemCode}`,
      { method: 'PATCH', body: payload }
    );
    return res.item;
  },

  async remove(buildingId: string, itemCode: string): Promise<void> {
    await apiClient(`/buildings/${buildingId}/boq/analytical/items/${itemCode}`, {
      method: 'DELETE',
    });
  },

  async importFromEmployer(buildingId: string, itemCode: string): Promise<AnalyticalBoqItem> {
    const res = await apiClient<{ item: AnalyticalBoqItem }>(
      `/buildings/${buildingId}/boq/analytical/import`,
      { method: 'POST', body: { itemCode } }
    );
    return res.item;
  },
};
