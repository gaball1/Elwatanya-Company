import { apiClient } from '@/lib/api/apiClient';

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriod: number;
  lateThreshold: number;
  earlyLeaveThreshold: number;
  overtimeEnabled: boolean;
}

export const shiftService = {
  async list(): Promise<Shift[]> {
    const data = await apiClient<{ items: Shift[] }>('/shifts', { method: 'GET' });
    return data.items;
  },
};
