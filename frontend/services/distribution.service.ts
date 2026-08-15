import { apiClient } from '@/lib/api/apiClient';
import type { FinalBoqItem } from "@/types/boq";

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
  ): Promise<FinalBoqItem> {
    const res = await apiClient<{ item: FinalBoqItem }>(
      `/buildings/${buildingId}/boq/final/items/${itemCode}/components/${componentId}/distribute`,
      { method: 'POST', body: { distribution } }
    );
    return res.item;
  },

  async distributeItem(
    buildingId: string,
    itemCode: string,
    distribution: DistributionEntry[]
  ): Promise<FinalBoqItem> {
    const res = await apiClient<{ item: FinalBoqItem }>(
      `/buildings/${buildingId}/boq/final/items/${itemCode}/distribute`,
      { method: 'POST', body: { distribution } }
    );
    return res.item;
  },

  async removeDistribution(
    buildingId: string,
    itemCode: string,
    contractorId: string,
    componentId?: string
  ): Promise<FinalBoqItem> {
    const suffix = componentId
      ? `/components/${componentId}/contractors/${contractorId}`
      : `/contractors/${contractorId}`;
    const res = await apiClient<{ item: FinalBoqItem }>(
      `/buildings/${buildingId}/boq/final/items/${itemCode}${suffix}`,
      { method: 'DELETE' }
    );
    return res.item;
  },
};
