import { apiClient } from '@/lib/api/apiClient';

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  managerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentData {
  code: string;
  name: string;
  description?: string;
  managerId?: string;
  status?: string;
}

export interface UpdateDepartmentData {
  code?: string;
  name?: string;
  description?: string;
  managerId?: string;
  status?: string;
}

export const departmentService = {
  async list(): Promise<Department[]> {
    const data = await apiClient<{ items: Department[] }>('/departments', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Department> {
    const data = await apiClient<{ department: Department }>(`/departments/${id}`, { method: 'GET' });
    return data.department;
  },
  async create(body: CreateDepartmentData): Promise<Department> {
    const data = await apiClient<{ department: Department }>('/departments', { method: 'POST', body });
    return data.department;
  },
  async update(id: string, body: UpdateDepartmentData): Promise<Department> {
    const data = await apiClient<{ department: Department }>(`/departments/${id}`, { method: 'PATCH', body });
    return data.department;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/departments/${id}`, { method: 'DELETE' });
  },
};
