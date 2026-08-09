import { Injectable } from '@nestjs/common';
import { BaseWorkflow, WorkflowStep } from './base.workflow';

@Injectable()
export class ApprovalProcessWorkflow extends BaseWorkflow {
  readonly name = 'approval_process';
  readonly description = 'Approve or reject pending approval requests';
  readonly requiredPermissions = ['approvals.read', 'approvals.approve'];
  readonly phases = [{ name: 'processing', description: 'Process approval request', steps: ['list_pending', 'process_approval'] }];

  readonly steps: WorkflowStep[] = [
    {
      name: 'list_pending',
      toolName: 'list_pending_approvals',
      args: (ctx) => ({
        entityType: ctx.entityType || undefined,
      }),
      requiresPermission: 'approvals.read',
      description: 'Look up pending approval requests',
    },
    {
      name: 'process_approval',
      toolName: 'approve_request',
      args: (ctx) => ({
        approvalId: ctx.approvalId,
        comment: ctx.approvalComment || 'Approved via AI Agent workflow',
      }),
      requiresPermission: 'approvals.approve',
      description: 'Process the approval decision',
    },
  ];

  validateContext(context: Record<string, any>): string[] {
    const missing: string[] = [];
    if (!context.approvalId && !context.entityType) {
      missing.push('approvalId (Approval ID to process) -or- entityType (type of approvals to review)');
    }
    if (context.action === 'reject' && !context.approvalComment) {
      missing.push('approvalComment (Reason for rejection)');
    }
    return missing;
  }

  getRequiredFields(): string[] {
    return ['approvalId'];
  }
}
