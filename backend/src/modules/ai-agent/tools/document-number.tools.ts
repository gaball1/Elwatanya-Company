import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class GenerateDocumentNumberTool extends BaseTool {
  readonly name = 'generate_document_number';
  readonly description = 'Generate a document number for a document type (purchase_order, extract, payment, invoice, project, etc.) with auto-increment and reset strategy';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    if (!args.documentType) return this.fail('documentType is required');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/document-number/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ documentType: args.documentType, date: args.date }),
        },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Document number generation failed');
    }
  }
}

@Injectable()
export class GetDocumentNumberConfigTool extends BaseTool {
  readonly name = 'get_document_number_config';
  readonly description = 'Get the document number configuration for a document type';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const documentType = args.documentType;
    const url = documentType
      ? `${process.env.API_URL || 'http://localhost:3001'}/api/v1/document-number/configs/${documentType}`
      : `${process.env.API_URL || 'http://localhost:3001'}/api/v1/document-number/configs`;

    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${user.token}` } });
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to get document number config');
    }
  }
}

@Injectable()
export class UpdateDocumentNumberConfigTool extends BaseTool {
  readonly name = 'update_document_number_config';
  readonly description = 'Update the document number format for a document type. Provide documentType, and optionally prefix, padding, and resetStrategy (none/yearly/monthly/daily)';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    if (!args.documentType) return this.fail('documentType is required');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/document-number/configs/${args.documentType}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ prefix: args.prefix, padding: args.padding, resetStrategy: args.resetStrategy }),
        },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to update config');
    }
  }
}
