import { apiClient } from '@/lib/api/apiClient';

export interface DistributionEntry {
  contractorId: string;
  quantity: number;
}

export const distributionService = {
  async distribute(
    buildingId: string,
    itemCode: string,
    componentId: string,
    distribution: DistributionEntry[]
  ): Promise<any> {
    const res = await apiClient<{ item: any }>(
      `/buildings/${buildingId}/boq/final/items/${itemCode}/components/${componentId}/distribute`,
      { method: 'POST', body: { distribution } }
    );
    return res.item;
  },
};
