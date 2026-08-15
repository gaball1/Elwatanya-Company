import { apiClient } from '@/lib/api/apiClient';

export interface SubcontractorContract {
  id: string;
  contractNumber: string;
  buildingId: string;
  subcontractorId: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  totalValue: number;
  terms: string[] | null;
  notes: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractData {
  buildingId: string;
  subcontractorId: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  totalValue?: number;
  terms?: string[];
  notes?: string;
  status?: string;
}

export interface UpdateContractData {
  title?: string;
  startDate?: string;
  endDate?: string;
  totalValue?: number;
  terms?: string[];
  notes?: string;
  status?: string;
}

export const subcontractorContractService = {
  async list(
    buildingId?: string,
    subcontractorId?: string
  ): Promise<SubcontractorContract[]> {
    const params = new URLSearchParams();
    if (buildingId) params.set("buildingId", buildingId);
    if (subcontractorId) params.set("subcontractorId", subcontractorId);
    const qs = params.toString();
    const data = await apiClient<{ items: SubcontractorContract[] }>(
      `/subcontractor-contracts${qs ? `?${qs}` : ""}`,
      { method: "GET" }
    );
    return data.items;
  },

  async get(id: string): Promise<SubcontractorContract> {
    const data = await apiClient<{ contract: SubcontractorContract }>(
      `/subcontractor-contracts/${id}`,
      { method: "GET" }
    );
    return data.contract;
  },

  async create(body: CreateContractData): Promise<SubcontractorContract> {
    const data = await apiClient<{ contract: SubcontractorContract }>(
      `/subcontractor-contracts`,
      { method: "POST", body }
    );
    return data.contract;
  },

  async update(
    id: string,
    body: UpdateContractData
  ): Promise<SubcontractorContract> {
    const data = await apiClient<{ contract: SubcontractorContract }>(
      `/subcontractor-contracts/${id}`,
      { method: "PATCH", body }
    );
    return data.contract;
  },

  async remove(id: string): Promise<void> {
    await apiClient(`/subcontractor-contracts/${id}`, { method: "DELETE" });
  },
};
