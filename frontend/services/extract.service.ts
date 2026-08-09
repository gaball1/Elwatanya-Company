import { apiClient } from '@/lib/api/apiClient';

export interface BackendExtractItemResponse {
  itemCode: string;
  description: string;
  unit: string;
  contractQuantity: number;
  previous: number;
  current: number;
  executionPercent: number;
  unitPrice: number;
  total: number;
  executedQuantity: number;
  workValue: number;
}

export interface BackendExtractItemRequest {
  itemCode: string;
  description: string;
  unit: string;
  contractQuantity: number;
  previous: number;
  current: number;
  executionPercent: number;
  unitPrice: number;
}

export interface Extract {
  id: string;
  buildingId: string;
  projectId?: string;
  contractorId: string;
  runningNumber?: number;
  date: string;
  status: string;
  label: string;
  insurancePercent: number;
  previousPaid: number;
  items: BackendExtractItemResponse[];
  deductions: any[];
  total: number;
  totalWorkValue: number;
  totalDeductions: number;
  netPayable: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExtractData {
  runningNumber: number;
  date: string;
  status: string;
  insurancePercent: number;
  previousPaid: number;
  items: BackendExtractItemRequest[];
  manualDeductions: { id: string; name: string; amount: number; type: 'manual' }[];
}

export interface ExtractMeta {
  previousPaid: number;
  previousQuantities: Record<string, number>;
  nextRunning: number;
}

export const extractService = {
  async list(buildingId: string, contractorId: string): Promise<Extract[]> {
    const data = await apiClient<{ items: Extract[] }>(
      `/buildings/${buildingId}/contractors/${contractorId}/extracts`,
      { method: 'GET' }
    );
    return data.items;
  },

  async get(buildingId: string, contractorId: string, extractId: string): Promise<Extract> {
    const data = await apiClient<{ extract: Extract }>(
      `/buildings/${buildingId}/contractors/${contractorId}/extracts/${extractId}`,
      { method: 'GET' }
    );
    return data.extract;
  },

  async getMeta(buildingId: string, contractorId: string): Promise<ExtractMeta> {
    const data = await apiClient<ExtractMeta>(
      `/buildings/${buildingId}/contractors/${contractorId}/extracts?meta=1`,
      { method: 'GET' }
    );
    return data;
  },

  async create(buildingId: string, contractorId: string, body: CreateExtractData): Promise<Extract> {
    const data = await apiClient<{ extract: Extract }>(
      `/buildings/${buildingId}/contractors/${contractorId}/extracts`,
      { method: 'POST', body }
    );
    return data.extract;
  },

  async update(buildingId: string, contractorId: string, extractId: string, body: Partial<CreateExtractData>): Promise<Extract> {
    const data = await apiClient<{ extract: Extract }>(
      `/buildings/${buildingId}/contractors/${contractorId}/extracts/${extractId}`,
      { method: 'PUT', body }
    );
    return data.extract;
  },

  async remove(buildingId: string, contractorId: string, extractId: string): Promise<void> {
    await apiClient<void>(
      `/buildings/${buildingId}/contractors/${contractorId}/extracts/${extractId}`,
      { method: 'DELETE' }
    );
  },
};
