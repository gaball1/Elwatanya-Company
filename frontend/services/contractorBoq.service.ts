import { apiClient } from '@/lib/api/apiClient';

export interface ContractorBoqItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  assignedQuantity: number;
  totalValue: number;
  finalItemId: string | null;
  componentId: string | null;
}

export interface ContractorBoqMeta {
  buildingId: string;
  contractorId: string;
  workType: string;
}

export const contractorBoqService = {
  async list(buildingId: string, contractorId: string): Promise<ContractorBoqItem[]> {
    const data = await apiClient<{ items: ContractorBoqItem[] }>(
      `/buildings/${buildingId}/contractors/${contractorId}/boq`,
      { method: 'GET' }
    );
    return data.items;
  },

  async getMeta(buildingId: string, contractorId: string): Promise<ContractorBoqMeta> {
    const data = await apiClient<{ meta: ContractorBoqMeta }>(
      `/buildings/${buildingId}/contractors/${contractorId}/boq/meta`,
      { method: 'GET' }
    );
    return data.meta;
  },

  async setMeta(
    buildingId: string,
    contractorId: string,
    workType: string
  ): Promise<ContractorBoqMeta> {
    const data = await apiClient<{ meta: ContractorBoqMeta }>(
      `/buildings/${buildingId}/contractors/${contractorId}/boq/meta`,
      { method: 'PUT', body: { workType } }
    );
    return data.meta;
  },

  async allocate(
    buildingId: string,
    contractorId: string,
    itemCodeOrComponent: string,
    quantity: number
  ): Promise<ContractorBoqItem[]> {
    const data = await apiClient<{ items: ContractorBoqItem[] }>(
      `/buildings/${buildingId}/contractors/${contractorId}/boq/allocate`,
      { method: 'POST', body: { itemCodeOrComponent, quantity } }
    );
    return data.items;
  },

  async updateQuantity(
    buildingId: string,
    contractorId: string,
    itemCode: string,
    quantity: number,
    componentId?: string
  ): Promise<ContractorBoqItem[]> {
    const data = await apiClient<{ items: ContractorBoqItem[] }>(
      `/buildings/${buildingId}/contractors/${contractorId}/boq/items/${itemCode}`,
      { method: 'PATCH', body: { quantity, componentId } }
    );
    return data.items;
  },

  async remove(
    buildingId: string,
    contractorId: string,
    itemCode: string,
    componentId?: string
  ): Promise<void> {
    const qs = componentId ? `?componentId=${componentId}` : '';
    await apiClient(
      `/buildings/${buildingId}/contractors/${contractorId}/boq/items/${itemCode}${qs}`,
      { method: 'DELETE' }
    );
  },

  async available(
    buildingId: string,
    contractorId: string,
    itemCode: string,
    componentId?: string
  ): Promise<number> {
    const params = new URLSearchParams({ itemCode });
    if (componentId) params.set('componentId', componentId);
    const data = await apiClient<{ available: number }>(
      `/buildings/${buildingId}/contractors/${contractorId}/boq/available?${params.toString()}`,
      { method: 'GET' }
    );
    return data.available;
  },
};
