import { apiClient } from '@/lib/api/apiClient';

export interface Employee {
  id: string;
  code: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  address: string;
  birthDate: string | null;
  hireDate: string | null;
  departmentId: string;
  roleId: string;
  salary: number;
  status: string;
  notes: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeData {
  code: string;
  fullName: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  address?: string;
  birthDate?: string;
  hireDate?: string;
  departmentId?: string;
  roleId?: string;
  salary?: number;
  status?: string;
  notes?: string;
}

export interface UpdateEmployeeData {
  code?: string;
  fullName?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  address?: string;
  birthDate?: string;
  hireDate?: string;
  departmentId?: string;
  roleId?: string;
  salary?: number;
  status?: string;
  notes?: string;
}

export const employeeService = {
  async list(): Promise<Employee[]> {
    const data = await apiClient<{ items: Employee[] }>('/employees', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Employee> {
    const data = await apiClient<{ employee: Employee }>(`/employees/${id}`, { method: 'GET' });
    return data.employee;
  },
  async create(body: CreateEmployeeData): Promise<Employee> {
    const data = await apiClient<{ employee: Employee }>('/employees', { method: 'POST', body });
    return data.employee;
  },
  async update(id: string, body: UpdateEmployeeData): Promise<Employee> {
    const data = await apiClient<{ employee: Employee }>(`/employees/${id}`, { method: 'PATCH', body });
    return data.employee;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/employees/${id}`, { method: 'DELETE' });
  },
};
