import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class SearchKnowledgeTool extends BaseTool {
  readonly name = 'search_knowledge';
  readonly description = 'Search the knowledge base for documents, contracts, BOQ files, and other construction documents. Use when user asks about document content, contract clauses, specifications, or any information stored in documents.';
  readonly requiresPermission = 'knowledge.read';
  readonly requiredEntity = 'knowledge';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const query = args.query || args.q || args.text;
    if (!query) return this.fail('Search query is required');

    try {
      const params = new URLSearchParams({ q: query });
      if (args.limit) params.set('limit', String(args.limit));
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/search?${params}`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Knowledge search unavailable');
    }
  }
}
