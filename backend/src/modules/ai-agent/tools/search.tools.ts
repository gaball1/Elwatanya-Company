import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class GlobalSearchTool extends BaseTool {
  readonly name = 'global_search';
  readonly description = 'Search across all ERP entities: projects, buildings, employees, contractors, inventory, documents, etc. Returns unified results.';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const q = args.query || args.q || args.text;
    if (!q) return this.fail('Search query is required');

    try {
      const params = new URLSearchParams({ q });
      if (args.types) params.set('types', args.types);
      if (args.limit) params.set('limit', String(args.limit));

      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/search?${params}`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Global search unavailable');
    }
  }
}
