import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class ListSignatureWorkflowsTool extends BaseTool {
  readonly name = 'list_signature_workflows';
  readonly description = 'List all signature workflow definitions, optionally filtered by entity type (purchase_order, extract, payment, etc.)';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const entityType = args.entityType || '';
    try {
      const url = entityType
        ? `${process.env.API_URL || 'http://localhost:3001'}/api/v1/signature-workflow/workflows`
        : `${process.env.API_URL || 'http://localhost:3001'}/api/v1/signature-workflow/workflows`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${user.token}` } });
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to list workflows');
    }
  }
}

@Injectable()
export class CreateSignatureWorkflowTool extends BaseTool {
  readonly name = 'create_signature_workflow';
  readonly description = 'Create a signature workflow. Provide name, entityType (document type), and steps array with label, roleName, and optional isFinal.';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    if (!args.name || !args.entityType || !args.steps) {
      return this.fail('name, entityType, and steps are required');
    }

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/signature-workflow/workflows`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ name: args.name, description: args.description, entityType: args.entityType, steps: args.steps }),
        },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to create workflow');
    }
  }
}

@Injectable()
export class SubmitForSignatureTool extends BaseTool {
  readonly name = 'submit_for_signature';
  readonly description = 'Submit a document for signature workflow. Provide workflowId, entityType, and entityId.';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    if (!args.workflowId || !args.entityType || !args.entityId) {
      return this.fail('workflowId, entityType, and entityId are required');
    }

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/signature-workflow/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ workflowId: args.workflowId, entityType: args.entityType, entityId: args.entityId }),
        },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to submit for signature');
    }
  }
}

@Injectable()
export class SignDocumentTool extends BaseTool {
  readonly name = 'sign_document';
  readonly description = 'Sign or reject a pending signature request. Provide requestId and status (signed/rejected). Optionally add comment and imageUrl.';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    if (!args.requestId || !args.status) {
      return this.fail('requestId and status (signed/rejected) are required');
    }

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/signature-workflow/requests/${args.requestId}/sign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ status: args.status, comment: args.comment, imageUrl: args.imageUrl }),
        },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to sign document');
    }
  }
}

@Injectable()
export class GetSignatureStatusTool extends BaseTool {
  readonly name = 'get_signature_status';
  readonly description = 'Get the signature workflow status for a document by entityType and entityId';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    if (!args.entityType || !args.entityId) {
      return this.fail('entityType and entityId are required');
    }

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/signature-workflow/status/${args.entityType}/${args.entityId}`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to get signature status');
    }
  }
}
