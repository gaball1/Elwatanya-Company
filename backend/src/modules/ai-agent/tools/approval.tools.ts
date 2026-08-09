import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { ToolResult } from '../dto/agent-response.dto';

@Injectable()
export class ListPendingApprovalsTool extends BaseTool {
  readonly name = 'list_pending_approvals';
  readonly description = 'List all pending approval requests';
  readonly requiresPermission = 'approvals.read';
  readonly requiredEntity = 'approval';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { entityType?: string }, user: any): Promise<ToolResult> {
    const query = args.entityType ? `?status=pending&entityType=${args.entityType}` : '?status=pending';
    const data = await this.api.get(`/api/v1/approvals${query}`, user.token);
    return this.success(data?.data?.items || []);
  }
}

@Injectable()
export class ApproveRequestTool extends BaseTool {
  readonly name = 'approve_request';
  readonly description = 'Approve a pending approval request';
  readonly requiresPermission = 'approvals.approve';
  readonly requiredEntity = 'approval';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { approvalId: string; comment?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.patch(`/api/v1/approvals/${args.approvalId}/approve`, {
      comment: args.comment || 'Approved by AI Agent',
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class RejectRequestTool extends BaseTool {
  readonly name = 'reject_request';
  readonly description = 'Reject a pending approval request';
  readonly requiresPermission = 'approvals.reject';
  readonly requiredEntity = 'approval';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { approvalId: string; comment: string }, user: any): Promise<ToolResult> {
    const data = await this.api.patch(`/api/v1/approvals/${args.approvalId}/reject`, {
      comment: args.comment || 'Rejected by AI Agent',
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class CreateApprovalTool extends BaseTool {
  readonly name = 'create_approval';
  readonly description = 'Submit a new approval request for any entity type: extract, purchase, leave, fund-transaction, client-statement, subcontractor-statement, or inventory (inventory request approval)';
  readonly requiresPermission = 'approvals.create';
  readonly requiredEntity = 'approval';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { entityType: string; entityId: string; comment?: string; status?: 'draft' | 'pending' }, user: any): Promise<ToolResult> {
    const data = await this.api.post('/api/v1/approvals', {
      entityType: args.entityType,
      entityId: args.entityId,
      comment: args.comment || '',
      status: args.status || 'pending',
    }, user.token);
    return this.success(data?.data || data);
  }
}
