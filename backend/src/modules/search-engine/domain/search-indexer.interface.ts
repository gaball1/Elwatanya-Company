import { IndexableEntity } from './search-engine.interface';

export interface SearchIndexer {
  readonly entityType: string;
  getAll(): Promise<IndexableEntity[]>;
  get(id: string): Promise<IndexableEntity | null>;
}
