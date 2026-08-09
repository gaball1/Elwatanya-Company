import { apiClient } from '@/lib/api/apiClient';

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  products: string[];
  paymentTerms: string;
  joinDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierData {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  products?: string[];
  paymentTerms?: string;
  joinDate?: string;
  status?: string;
}

export interface UpdateSupplierData {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  products?: string[];
  paymentTerms?: string;
  joinDate?: string;
  status?: string;
}

export const supplierService = {
  async list(): Promise<Supplier[]> {
    const data = await apiClient<{ items: Supplier[] }>('/suppliers', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Supplier> {
    const data = await apiClient<{ supplier: Supplier }>(`/suppliers/${id}`, { method: 'GET' });
    return data.supplier;
  },
  async create(body: CreateSupplierData): Promise<Supplier> {
    const data = await apiClient<{ supplier: Supplier }>('/suppliers', { method: 'POST', body });
    return data.supplier;
  },
  async update(id: string, body: UpdateSupplierData): Promise<Supplier> {
    const data = await apiClient<{ supplier: Supplier }>(`/suppliers/${id}`, { method: 'PATCH', body });
    return data.supplier;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/suppliers/${id}`, { method: 'DELETE' });
  },
};
