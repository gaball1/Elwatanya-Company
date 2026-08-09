import { apiClient } from '@/lib/api/apiClient';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  joinDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  joinDate?: string;
  status?: string;
}

export interface UpdateClientData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  joinDate?: string;
  status?: string;
}

export const clientService = {
  async list(): Promise<Client[]> {
    const data = await apiClient<{ items: Client[] }>('/clients', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Client> {
    const data = await apiClient<{ client: Client }>(`/clients/${id}`, { method: 'GET' });
    return data.client;
  },
  async create(body: CreateClientData): Promise<Client> {
    const data = await apiClient<{ client: Client }>('/clients', { method: 'POST', body });
    return data.client;
  },
  async update(id: string, body: UpdateClientData): Promise<Client> {
    const data = await apiClient<{ client: Client }>(`/clients/${id}`, { method: 'PATCH', body });
    return data.client;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/clients/${id}`, { method: 'DELETE' });
  },
};
