import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SearchEngineService } from '../search-engine.service';
import { SearchIndexer } from '../domain/search-indexer.interface';
import { IndexableEntity } from '../domain/search-engine.interface';

function buildIndexer(
  entityType: string,
  prisma: PrismaService,
  model: string,
  titleField: string,
  descriptionFields: string[],
  tagsFields: string[] = [],
  projectIdField?: string,
): SearchIndexer {
  return {
    entityType,
    async getAll(): Promise<IndexableEntity[]> {
      const rows: any[] = await (prisma as any)[model].findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          ...Object.fromEntries(descriptionFields.map((f) => [f, true])),
          ...Object.fromEntries(tagsFields.map((f) => [f, true])),
          ...(projectIdField ? { [projectIdField]: true } : {}),
          createdAt: true,
        },
      });
      return rows.map((row) => ({
        id: row.id,
        entityType,
        title: String(row[titleField] ?? ''),
        description: descriptionFields.map((f) => String(row[f] ?? '')).filter(Boolean).join(' | '),
        content: descriptionFields.concat(tagsFields).map((f) => String(row[f] ?? '')).join(' '),
        tags: tagsFields.map((f) => String(row[f] ?? '')).filter(Boolean),
        ...(projectIdField && row[projectIdField] ? { projectId: row[projectIdField] } : {}),
      }));
    },
    async get(id: string): Promise<IndexableEntity | null> {
      const row: any = await (prisma as any)[model].findUnique({ where: { id } });
      if (!row) return null;
      return {
        id: row.id,
        entityType,
        title: String(row[titleField] ?? ''),
        description: descriptionFields.map((f) => String(row[f] ?? '')).filter(Boolean).join(' | '),
        content: descriptionFields.concat(tagsFields).map((f) => String(row[f] ?? '')).join(' '),
        tags: tagsFields.map((f) => String(row[f] ?? '')).filter(Boolean),
        ...(projectIdField && row[projectIdField] ? { projectId: row[projectIdField] } : {}),
      };
    },
  };
}

@Injectable()
export class SearchIndexerService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchEngine: SearchEngineService,
  ) {}

  onModuleInit() {
    const indexers = [
      buildIndexer('project', this.prisma, 'project', 'name', ['name', 'description', 'code'], ['status']),
      buildIndexer('building', this.prisma, 'building', 'name', ['name', 'code', 'type', 'description'], ['status'], 'projectId'),
      buildIndexer('employee', this.prisma, 'employee', 'fullName', ['fullName', 'code', 'email', 'phone'], ['status']),
      buildIndexer('supplier', this.prisma, 'supplier', 'name', ['name', 'contactPerson', 'phone', 'email', 'address'], ['status']),
      buildIndexer('subcontractor', this.prisma, 'subcontractor', 'name', ['name', 'workType', 'phone', 'email'], ['status']),
      buildIndexer('client', this.prisma, 'client', 'name', ['name', 'contactPerson', 'phone', 'email', 'address'], ['status']),
      buildIndexer('purchase', this.prisma, 'purchase', 'itemName', ['itemName', 'description', 'invoiceNumber'], ['status'], 'projectId'),
      buildIndexer('inventory-item', this.prisma, 'inventoryItem', 'name', ['name', 'code', 'description'], ['status']),
      buildIndexer('department', this.prisma, 'department', 'name', ['name', 'code', 'description'], ['status']),
      buildIndexer('project-fund', this.prisma, 'projectFund', 'name', ['name', 'description'], ['status'], 'projectId'),
    ];

    for (const indexer of indexers) {
      this.searchEngine.registerIndexer(indexer);
    }

    this.searchEngine.buildIndex().catch(() => {});
  }
}
