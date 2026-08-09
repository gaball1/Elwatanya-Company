import { Injectable } from '@nestjs/common';
import { BaseWorkflow, WorkflowStep, WorkflowPhase } from './base.workflow';

@Injectable()
export class ExtractWorkflow extends BaseWorkflow {
  readonly name = 'extract_workflow';
  readonly description = 'Complete extract lifecycle from creation to payment';
  readonly requiredPermissions = ['extracts.create', 'approvals.create', 'approvals.approve', 'fund-transactions.create'];

  readonly phases: WorkflowPhase[] = [
    { name: 'extract_preparation', description: 'Create extract with items and deductions', steps: ['generate_extract'] },
    { name: 'validation', description: 'Validate quantities and calculate', steps: ['validate_quantities', 'calculate_deductions', 'calculate_insurance'] },
    { name: 'approval', description: 'Route for approval', steps: ['create_approval', 'approve_extract'] },
    { name: 'payment', description: 'Process payment and finalize', steps: ['generate_payment', 'update_treasury', 'notify_completion'] },
  ];

  readonly steps: WorkflowStep[] = [
    {
      name: 'generate_extract',
      toolName: 'create_extract',
      args: (ctx) => ({
        buildingId: ctx.buildingId,
        subcontractorId: ctx.subcontractorId,
        date: ctx.extractDate || new Date().toISOString().split('T')[0],
        insurancePercent: Number(ctx.insurancePercent) || 5,
        previousPaid: Number(ctx.previousPaid) || 0,
        items: ctx.extractItems || [],
        manualDeductions: ctx.manualDeductions || [],
        status: 'running',
      }),
      requiresPermission: 'extracts.create',
      description: 'Generate the extract with quantities',
      progressLabel: 'Generating extract',
      dependsOn: ['buildingId', 'subcontractorId'],
    },
    {
      name: 'validate_quantities',
      toolName: 'create_extract',
      args: (ctx) => ({
        buildingId: ctx.buildingId,
        subcontractorId: ctx.subcontractorId,
        date: ctx.extractDate,
        insurancePercent: Number(ctx.insurancePercent) || 5,
        previousPaid: Number(ctx.previousPaid) || 0,
        items: ctx.extractItems || [],
        status: 'running',
      }),
      requiresPermission: 'extracts.create',
      description: 'Validate extract quantities against BOQ',
      progressLabel: 'Validating quantities',
      dependsOn: ['_step_generate_extract_id'],
      optional: true,
    },
    {
      name: 'calculate_deductions',
      toolName: 'create_extract',
      args: (ctx) => ({
        buildingId: ctx.buildingId,
        subcontractorId: ctx.subcontractorId,
        date: ctx.extractDate,
        insurancePercent: Number(ctx.insurancePercent) || 5,
        previousPaid: Number(ctx.previousPaid) || 0,
        items: ctx.extractItems || [],
        manualDeductions: ctx.manualDeductions || [],
        status: 'running',
      }),
      requiresPermission: 'extracts.create',
      description: 'Calculate applicable deductions',
      progressLabel: 'Calculating deductions',
      dependsOn: ['_step_generate_extract_id'],
      optional: true,
    },
    {
      name: 'calculate_insurance',
      toolName: 'create_extract',
      args: (ctx) => ({
        buildingId: ctx.buildingId,
        subcontractorId: ctx.subcontractorId,
        date: ctx.extractDate,
        insurancePercent: Number(ctx.insurancePercent) || 5,
        previousPaid: Number(ctx.previousPaid) || 0,
        items: ctx.extractItems || [],
        status: 'running',
      }),
      requiresPermission: 'extracts.create',
      description: 'Calculate insurance retention',
      progressLabel: 'Calculating insurance',
      dependsOn: ['_step_generate_extract_id'],
      optional: true,
    },
    {
      name: 'create_approval',
      toolName: 'create_approval',
      args: (ctx) => ({
        entityType: 'extract',
        entityId: ctx._step_generate_extract_id,
        comment: `Extract approval for subcontractor ${ctx.subcontractorId}`,
      }),
      requiresPermission: 'approvals.create',
      description: 'Submit extract for approval',
      progressLabel: 'Routing for approval',
      dependsOn: ['_step_generate_extract_id'],
    },
    {
      name: 'approve_extract',
      toolName: 'approve_request',
      args: (ctx) => ({
        approvalId: ctx._step_create_approval_id || ctx.approvalId,
        comment: 'Extract auto-approved via workflow',
      }),
      requiresPermission: 'approvals.approve',
      description: 'Approve the extract',
      progressLabel: 'Completing approval',
      dependsOn: ['_step_create_approval_id'],
      optional: true,
    },
    {
      name: 'generate_payment',
      toolName: 'list_payments',
      args: () => ({}),
      requiresPermission: 'payments.read',
      description: 'Generate payment record',
      progressLabel: 'Generating payment',
      optional: true,
    },
    {
      name: 'notify_completion',
      toolName: 'create_notification',
      args: (ctx) => ({
        title: `Extract Processed`,
        message: `Extract for subcontractor ${ctx.subcontractorId} has been fully processed and paid.`,
        type: 'success',
        entityType: 'extract',
        entityId: ctx._step_generate_extract_id,
      }),
      requiresPermission: 'notifications.create',
      description: 'Send extract completion notification',
      progressLabel: 'Sending notification',
      dependsOn: ['_step_generate_extract_id'],
      optional: true,
    },
    {
      name: 'update_treasury',
      toolName: 'create_fund_transaction',
      args: (ctx) => ({
        fundId: ctx.fundId,
        type: 'deduct',
        amount: Number(ctx.extractTotal) || 0,
        category: 'purchase',
        description: `Extract payment: ${ctx.subcontractorId}`,
      }),
      requiresPermission: 'fund-transactions.create',
      description: 'Deduct from treasury',
      progressLabel: 'Updating treasury',
      dependsOn: ['fundId'],
      condition: (ctx) => !!ctx.fundId,
    },
  ];

  validateContext(context: Record<string, any>): string[] {
    const missing: string[] = [];
    if (!context.buildingId) missing.push('buildingId (Building ID)');
    if (!context.subcontractorId) missing.push('subcontractorId (Subcontractor ID)');
    if (!context.extractItems) missing.push('extractItems (Extract items array)');
    if (!context.extractDate) missing.push('extractDate (Extract date)');
    return missing;
  }

  getRequiredFields(): string[] {
    return ['buildingId', 'subcontractorId', 'extractItems', 'extractDate'];
  }
}
