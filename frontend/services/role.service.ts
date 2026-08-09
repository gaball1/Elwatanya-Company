import { apiClient } from '@/lib/api/apiClient';

export interface PermissionInfo {
  id: string;
  name: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: PermissionInfo[];
  status: string;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export const roleService = {
  async list(): Promise<Role[]> {
    const data = await apiClient<{ items: Role[] }>('/admin/roles', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Role> {
    const data = await apiClient<Role>(`/admin/roles/${id}`, { method: 'GET' });
    return data;
  },
  async create(body: CreateRoleData): Promise<Role> {
    const data = await apiClient<Role>('/admin/roles', { method: 'POST', body });
    return data;
  },
  async update(id: string, body: UpdateRoleData): Promise<Role> {
    const data = await apiClient<Role>(`/admin/roles/${id}`, { method: 'PATCH', body });
    return data;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/admin/roles/${id}`, { method: 'DELETE' });
  },
};

export async function fetchAllPermissions(): Promise<PermissionInfo[]> {
  const data = await apiClient<{ items: PermissionInfo[] }>('/permissions', { method: 'GET' });
  return data.items;
}
