import { apiClient } from '@/lib/api/apiClient';

export interface Payment {
  id: string;
  buildingId: string;
  contractorId: string;
  extractId: string;
  amount: number;
  date: string;
  notes?: string;
  status: 'pending' | 'approved';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentData {
  amount: number;
  date: string;
  extractId?: string;
  notes?: string;
}

export interface UpdatePaymentData {
  amount?: number;
  date?: string;
  notes?: string;
  status?: 'pending' | 'approved';
}

export const paymentService = {
  async list(buildingId: string, contractorId: string): Promise<Payment[]> {
    const data = await apiClient<{ items: Payment[] }>(
      `/buildings/${buildingId}/contractors/${contractorId}/payments`,
      { method: 'GET' }
    );
    return data.items;
  },

  async get(buildingId: string, contractorId: string, paymentId: string): Promise<Payment> {
    const data = await apiClient<{ payment: Payment }>(
      `/buildings/${buildingId}/contractors/${contractorId}/payments/${paymentId}`,
      { method: 'GET' }
    );
    return data.payment;
  },

  async create(buildingId: string, contractorId: string, body: CreatePaymentData): Promise<Payment> {
    const data = await apiClient<{ payment: Payment }>(
      `/buildings/${buildingId}/contractors/${contractorId}/payments`,
      { method: 'POST', body }
    );
    return data.payment;
  },

  async update(buildingId: string, contractorId: string, paymentId: string, body: UpdatePaymentData): Promise<Payment> {
    const data = await apiClient<{ payment: Payment }>(
      `/buildings/${buildingId}/contractors/${contractorId}/payments/${paymentId}`,
      { method: 'PATCH', body }
    );
    return data.payment;
  },

  async approve(buildingId: string, contractorId: string, paymentId: string): Promise<Payment> {
    return this.update(buildingId, contractorId, paymentId, { status: 'approved' });
  },

  async remove(buildingId: string, contractorId: string, paymentId: string): Promise<void> {
    await apiClient<{ payment: Payment }>(
      `/buildings/${buildingId}/contractors/${contractorId}/payments/${paymentId}`,
      { method: 'DELETE' }
    );
  },
};
