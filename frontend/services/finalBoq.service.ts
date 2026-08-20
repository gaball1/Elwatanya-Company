import { apiClient } from '@/lib/api/apiClient';
import type { FinalBoqItem } from '@/types/boq';

export const finalBoqService = {
  async list(buildingId: string): Promise<FinalBoqItem[]> {
    const data = await apiClient<{ items: FinalBoqItem[] }>(
      `/buildings/${buildingId}/boq/final`,
      { method: 'GET' }
    );
    return data.items;
  },

  async syncFromAnalytical(buildingId: string): Promise<FinalBoqItem[]> {
    const data = await apiClient<{ items: FinalBoqItem[] }>(
      `/buildings/${buildingId}/boq/final/sync-from-analytical`,
      { method: 'POST' }
    );
    return data.items;
  },

  async importFromEmployer(
    buildingId: string,
    itemCode: string
  ): Promise<FinalBoqItem> {
    const res = await apiClient<{ item: FinalBoqItem }>(
      `/buildings/${buildingId}/boq/final/import`,
      { method: 'POST', body: { itemCode } }
    );
    return res.item;
  },

  async update(
    buildingId: string,
    itemCode: string,
    payload: { description: string; quantity: number; unitPrice: number; unit: string; status: string }
  ): Promise<FinalBoqItem> {
    const res = await apiClient<{ item: FinalBoqItem }>(
      `/buildings/${buildingId}/boq/final/items/${itemCode}`,
      { method: 'PATCH', body: payload }
    );
    return res.item;
  },

  async updateQuantity(
    buildingId: string,
    itemCode: string,
    quantity: number,
    unitPrice: number
  ): Promise<FinalBoqItem> {
    const res = await apiClient<{ item: FinalBoqItem }>(
      `/buildings/${buildingId}/boq/final/items/${itemCode}/quantity`,
      { method: 'PATCH', body: { quantity, unitPrice } }
    );
    return res.item;
  },

  async remove(buildingId: string, itemCode: string): Promise<void> {
    await apiClient(`/buildings/${buildingId}/boq/final/items/${itemCode}`, {
      method: 'DELETE',
    });
  },

  async analyze(
    buildingId: string,
    itemCode: string,
    components: { name: string; unit: string; unitPrice: number }[]
  ): Promise<FinalBoqItem> {
    const res = await apiClient<{ item: FinalBoqItem }>(
      `/buildings/${buildingId}/boq/final/items/${itemCode}/analyze`,
      { method: 'POST', body: { components } }
    );
    return res.item;
  },

  async unanalyze(
    buildingId: string,
    itemCode: string
  ): Promise<FinalBoqItem> {
    const res = await apiClient<{ item: FinalBoqItem }>(
      `/buildings/${buildingId}/boq/final/items/${itemCode}/unanalyze`,
      { method: 'POST' }
    );
    return res.item;
  },

  async addComponent(
    buildingId: string,
    itemCode: string,
    component: { name: string; unit: string; unitPrice: number }
  ): Promise<FinalBoqItem> {
    const res = await apiClient<{ item: FinalBoqItem }>(
      `/buildings/${buildingId}/boq/final/items/${itemCode}/components`,
      { method: 'POST', body: component }
    );
    return res.item;
  },

  async updateComponent(
    buildingId: string,
    itemCode: string,
    componentId: string,
    payload: { unitPrice: number; quantity: number }
  ): Promise<FinalBoqItem> {
    const res = await apiClient<{ item: FinalBoqItem }>(
      `/buildings/${buildingId}/boq/final/items/${itemCode}/components/${componentId}`,
      { method: 'PATCH', body: payload }
    );
    return res.item;
  },

  async removeComponent(
    buildingId: string,
    itemCode: string,
    componentId: string
  ): Promise<FinalBoqItem> {
    const res = await apiClient<{ item: FinalBoqItem }>(
      `/buildings/${buildingId}/boq/final/items/${itemCode}/components/${componentId}`,
      { method: 'DELETE' }
    );
    return res.item;
  },
};
