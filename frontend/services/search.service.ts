import { apiClient } from '@/lib/api/apiClient';

export interface SearchResultItem {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string;
  score: number;
  source: string;
  url?: string;
  metadata?: Record<string, any>;
}

export interface SearchResults {
  results: SearchResultItem[];
  total: number;
  page: number;
  totalPages: number;
  queryTime: number;
}

export const searchService = {
  async search(query: string, types?: string[]): Promise<SearchResults> {
    const params = new URLSearchParams({ q: query });
    if (types?.length) params.set('types', types.join(','));
    params.set('limit', '20');
    const data = await apiClient<SearchResults>(`/search?${params.toString()}`, { method: 'GET' });
    return data;
  },
};
