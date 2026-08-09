import { apiClient } from '@/lib/api/apiClient';

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description: string;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayData {
  name: string;
  date: string;
  description?: string;
  isRecurring?: boolean;
}

export interface UpdateHolidayData {
  name?: string;
  date?: string;
  description?: string;
  isRecurring?: boolean;
}

export const holidayService = {
  async list(): Promise<Holiday[]> {
    const data = await apiClient<{ items: Holiday[] }>('/holidays', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Holiday> {
    const data = await apiClient<{ holiday: Holiday }>(`/holidays/${id}`, { method: 'GET' });
    return data.holiday;
  },
  async create(body: CreateHolidayData): Promise<Holiday> {
    const data = await apiClient<{ holiday: Holiday }>('/holidays', { method: 'POST', body });
    return data.holiday;
  },
  async update(id: string, body: UpdateHolidayData): Promise<Holiday> {
    const data = await apiClient<{ holiday: Holiday }>(`/holidays/${id}`, { method: 'PATCH', body });
    return data.holiday;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/holidays/${id}`, { method: 'DELETE' });
  },
};
