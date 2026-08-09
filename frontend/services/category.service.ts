import { apiClient } from '@/lib/api/apiClient';

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string;
  parentId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  status?: string;
}

export interface UpdateCategoryData {
  code?: string;
  name?: string;
  description?: string;
  parentId?: string;
  status?: string;
}

export const categoryService = {
  async list(): Promise<Category[]> {
    const data = await apiClient<{ items: Category[] }>('/categories', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Category> {
    const data = await apiClient<{ category: Category }>(`/categories/${id}`, { method: 'GET' });
    return data.category;
  },
  async create(body: CreateCategoryData): Promise<Category> {
    const data = await apiClient<{ category: Category }>('/categories', { method: 'POST', body });
    return data.category;
  },
  async update(id: string, body: UpdateCategoryData): Promise<Category> {
    const data = await apiClient<{ category: Category }>(`/categories/${id}`, { method: 'PATCH', body });
    return data.category;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/categories/${id}`, { method: 'DELETE' });
  },
};
