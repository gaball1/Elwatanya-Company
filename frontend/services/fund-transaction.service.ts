import { apiClient } from '@/lib/api/apiClient';

export interface FundTransaction {
  id: string;
  fundId: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  referenceId: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFundTransactionData {
  fundId: string;
  type: string;
  category?: string;
  amount: number;
  description?: string;
  date?: string;
  status?: string;
  referenceId?: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateFundTransactionData {
  type?: string;
  category?: string;
  amount?: number;
  description?: string;
  date?: string;
  status?: string;
  referenceId?: string;
  notes?: string;
  createdBy?: string;
}

export const fundTransactionService = {
  async list(): Promise<FundTransaction[]> {
    const data = await apiClient<{ items: FundTransaction[] }>('/fund-transactions', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<FundTransaction> {
    const data = await apiClient<{ transaction: FundTransaction }>(`/fund-transactions/${id}`, { method: 'GET' });
    return data.transaction;
  },
  async create(body: CreateFundTransactionData): Promise<FundTransaction> {
    const data = await apiClient<{ transaction: FundTransaction }>('/fund-transactions', { method: 'POST', body });
    return data.transaction;
  },
  async update(id: string, body: UpdateFundTransactionData): Promise<FundTransaction> {
    const data = await apiClient<{ transaction: FundTransaction }>(`/fund-transactions/${id}`, { method: 'PATCH', body });
    return data.transaction;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/fund-transactions/${id}`, { method: 'DELETE' });
  },
};
