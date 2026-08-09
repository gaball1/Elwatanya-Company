import { Injectable, Logger } from '@nestjs/common';
import { SearchQuery, SearchResults, SearchResultItem, IndexableEntity, SearchFilter } from './domain/search-engine.interface';
import { SearchIndexer } from './domain/search-indexer.interface';

@Injectable()
export class SearchEngineService {
  private readonly logger = new Logger(SearchEngineService.name);
  private indexers = new Map<string, SearchIndexer>();
  private index = new Map<string, IndexableEntity[]>();

  registerIndexer(indexer: SearchIndexer): void {
    this.indexers.set(indexer.entityType, indexer);
    this.logger.log(`Search indexer registered: ${indexer.entityType}`);
  }

  async buildIndex(): Promise<void> {
    this.index.clear();
    for (const [type, indexer] of this.indexers) {
      try {
        const entities = await indexer.getAll();
        this.index.set(type, entities);
        this.logger.log(`Indexed ${entities.length} ${type} entities`);
      } catch (err) {
        this.logger.error(`Failed to index ${type}: ${(err as Error).message}`);
      }
    }
  }

  async search(query: SearchQuery): Promise<SearchResults> {
    const start = Date.now();
    const q = query.text.toLowerCase();
    const types = query.entityTypes ?? Array.from(this.index.keys());

    let results: SearchResultItem[] = [];

    for (const type of types) {
      const entities = this.index.get(type) ?? [];
      for (const entity of entities) {
        const score = this.calculateScore(q, entity);
        if (score > 0) {
          results.push({
            id: entity.id,
            entityType: entity.entityType,
            entityId: entity.id,
            title: entity.title,
            description: entity.description.substring(0, 200),
            score,
            source: 'keyword',
            url: `/${entity.entityType}s/${entity.id}`,
            metadata: entity.metadata,
          });
        }
      }
    }

    // Apply filters
    if (query.filters) {
      results = results.filter((r) => this.matchFilters(r, query.filters!));
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Paginate
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const total = results.length;
    const paginated = results.slice((page - 1) * limit, page * limit);

    return {
      results: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      queryTime: Date.now() - start,
    };
  }

  async indexEntity(entity: IndexableEntity): Promise<void> {
    const type = entity.entityType;
    const existing = this.index.get(type) ?? [];
    const idx = existing.findIndex((e) => e.id === entity.id);
    if (idx >= 0) {
      existing[idx] = entity;
    } else {
      existing.push(entity);
    }
    this.index.set(type, existing);
  }

  async removeEntity(entityType: string, entityId: string): Promise<void> {
    const existing = this.index.get(entityType) ?? [];
    this.index.set(entityType, existing.filter((e) => e.id !== entityId));
  }

  private calculateScore(q: string, entity: IndexableEntity): number {
    let score = 0;
    const title = entity.title.toLowerCase();
    const desc = entity.description.toLowerCase();
    const content = entity.content.toLowerCase();

    if (title === q) score += 10;
    else if (title.includes(q)) score += 5;
    if (desc.includes(q)) score += 3;
    if (content.includes(q)) score += 1;

    if (entity.tags) {
      for (const tag of entity.tags) {
        if (tag.toLowerCase().includes(q)) score += 2;
      }
    }

    if (entity.projectId && entity.projectId.toLowerCase().includes(q)) score += 1;

    return score;
  }

  private matchFilters(item: SearchResultItem, filters: SearchFilter[]): boolean {
    for (const f of filters) {
      const val = item.metadata?.[f.field] ?? (item as any)[f.field];
      if (val === undefined) return false;
      switch (f.operator) {
        case 'eq': if (val !== f.value) return false; break;
        case 'neq': if (val === f.value) return false; break;
        case 'contains': if (!String(val).includes(String(f.value))) return false; break;
        case 'in': if (!(f.value as any[])?.includes(val)) return false; break;
        default: break;
      }
    }
    return true;
  }
}
