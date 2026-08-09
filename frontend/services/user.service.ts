import { apiClient } from '@/lib/api/apiClient';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  projectId?: string | null;
  employeeId?: string | null;
  employee?: { id: string; fullName: string; code: string } | null;
  roles: { id: string; name: string; description?: string }[];
  projects: { id: string; name: string; code: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  permissions?: { id: string; name: string; description?: string }[];
}

export const userService = {
  async list(params?: { search?: string; status?: string }): Promise<User[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    const data = await apiClient<{ items: User[] }>(`/admin/users${qs ? `?${qs}` : ''}`, { method: 'GET' });
    return data.items;
  },

  async get(id: string): Promise<User> {
    return apiClient<User>(`/admin/users/${id}`, { method: 'GET' });
  },

  async create(body: { email: string; name: string; password: string }): Promise<User> {
    return apiClient<User>('/admin/users', { method: 'POST', body });
  },

  async update(id: string, body: { email?: string; name?: string; status?: string }): Promise<User> {
    return apiClient<User>(`/admin/users/${id}`, { method: 'PATCH', body });
  },

  async remove(id: string): Promise<void> {
    await apiClient(`/admin/users/${id}`, { method: 'DELETE' });
  },

  async activate(id: string): Promise<void> {
    await apiClient(`/admin/users/${id}/activate`, { method: 'POST' });
  },

  async disable(id: string): Promise<void> {
    await apiClient(`/admin/users/${id}/disable`, { method: 'POST' });
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await apiClient(`/admin/users/${id}/reset-password`, { method: 'POST', body: { newPassword } });
  },

  async assignRoles(id: string, roleIds: string[]): Promise<void> {
    await apiClient(`/admin/users/${id}/roles`, { method: 'POST', body: { roleIds } });
  },

  async assignProjects(id: string, projectIds: string[]): Promise<void> {
    await apiClient(`/admin/users/${id}/projects`, { method: 'POST', body: { projectIds } });
  },
};

export const roleService = {
  async list(): Promise<Role[]> {
    const data = await apiClient<{ items: Role[] }>('/admin/roles', { method: 'GET' });
    return data.items;
  },
};
