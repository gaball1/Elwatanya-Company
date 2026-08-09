export interface SearchQuery {
  text: string;
  entityTypes?: string[];
  filters?: SearchFilter[];
  page?: number;
  limit?: number;
  strategy?: 'hybrid' | 'semantic' | 'keyword';
}

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';
  value: any;
}

export interface SearchResults {
  results: SearchResultItem[];
  total: number;
  page: number;
  totalPages: number;
  queryTime: number;
}

export interface SearchResultItem {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string;
  score: number;
  source: 'semantic' | 'keyword' | 'hybrid';
  url?: string;
  metadata?: Record<string, any>;
}

export interface IndexableEntity {
  id: string;
  entityType: string;
  title: string;
  description: string;
  content: string;
  metadata?: Record<string, any>;
  tags?: string[];
  projectId?: string;
}
