import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class ListTemplatesTool extends BaseTool {
  readonly name = 'list_templates';
  readonly description = 'List document templates, optionally filtered by category.';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const category = args.category || '';
    const url = category
      ? `${process.env.API_URL || 'http://localhost:3001'}/api/v1/document-engine/templates?category=${category}`
      : `${process.env.API_URL || 'http://localhost:3001'}/api/v1/document-engine/templates`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${user.token}` } });
      const data = await res.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to list templates');
    }
  }
}

@Injectable()
export class CreateDocumentTool extends BaseTool {
  readonly name = 'create_document';
  readonly description = 'Create a new document from a template. Provide templateId, title, and variables.';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    if (!args.templateId || !args.title) return this.fail('templateId and title are required');
    try {
      const res = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/document-engine/documents/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ templateId: args.templateId, title: args.title, variables: args.variables || {} }),
        },
      );
      const data = await res.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to create document');
    }
  }
}

@Injectable()
export class ListDocumentsTool extends BaseTool {
  readonly name = 'list_documents';
  readonly description = 'List documents, optionally filtered by category or entity.';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const params = new URLSearchParams();
    if (args.category) params.set('category', args.category);
    if (args.entityType) params.set('entityType', args.entityType);
    if (args.entityId) params.set('entityId', args.entityId);
    const qs = params.toString();
    try {
      const res = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/document-engine/documents${qs ? '?' + qs : ''}`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await res.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to list documents');
    }
  }
}
