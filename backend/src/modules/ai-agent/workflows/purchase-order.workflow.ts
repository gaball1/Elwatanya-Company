import { Injectable } from '@nestjs/common';
import { BaseWorkflow, WorkflowStep, WorkflowPhase } from './base.workflow';

@Injectable()
export class PurchaseOrderWorkflow extends BaseWorkflow {
  readonly name = 'purchase_order';
  readonly description = 'Complete purchase order workflow from creation to payment';
  readonly requiredPermissions = ['purchases.create', 'purchases.update', 'approvals.create', 'approvals.approve', 'fund-transactions.create'];

  readonly phases: WorkflowPhase[] = [
    { name: 'purchase_creation', description: 'Create purchase order', steps: ['create_purchase'] },
    { name: 'supplier_assignment', description: 'Assign supplier', steps: ['attach_supplier'] },
    { name: 'approval', description: 'Route for approval', steps: ['create_approval_request', 'wait_approval'] },
    { name: 'fulfillment', description: 'Process payment and update treasury', steps: ['deduct_treasury', 'notify_completion'] },
  ];

  readonly steps: WorkflowStep[] = [
    {
      name: 'create_purchase',
      toolName: 'create_purchase',
      args: (ctx) => ({
        projectId: ctx.projectId,
        itemName: ctx.itemName,
        quantity: Number(ctx.quantity),
        unit: ctx.unit,
        unitPrice: Number(ctx.unitPrice),
        total: Number(ctx.quantity) * Number(ctx.unitPrice),
        date: ctx.purchaseDate || new Date().toISOString().split('T')[0],
        status: 'pending',
      }),
      requiresPermission: 'purchases.create',
      description: 'Create the purchase order',
      progressLabel: 'Creating purchase order',
    },
    {
      name: 'attach_supplier',
      toolName: 'update_purchase',
      args: (ctx) => ({
        id: ctx._step_create_purchase_id,
        supplierId: ctx.supplierId,
        notes: ctx.purchaseNotes || `Purchase: ${ctx.itemName}`,
      }),
      requiresPermission: 'purchases.update',
      description: 'Assign supplier to the purchase',
      progressLabel: 'Assigning supplier',
      dependsOn: ['_step_create_purchase_id'],
      condition: (ctx) => !!ctx.supplierId,
    },
    {
      name: 'create_approval_request',
      toolName: 'create_approval',
      args: (ctx) => ({
        entityType: 'purchase',
        entityId: ctx._step_create_purchase_id,
        comment: `Purchase order for ${ctx.itemName} - ${ctx.quantity} ${ctx.unit} at ${ctx.unitPrice}`,
      }),
      requiresPermission: 'approvals.create',
      description: 'Submit purchase for approval',
      progressLabel: 'Routing for approval',
      dependsOn: ['_step_create_purchase_id'],
    },
    {
      name: 'wait_approval',
      toolName: 'approve_request',
      args: (ctx) => ({
        approvalId: undefined, // Will be filled from context
        comment: 'Auto-approved via purchase workflow',
      }),
      requiresPermission: 'approvals.approve',
      description: 'Process approval decision',
      progressLabel: 'Completing approval',
      optional: true,
    },
    {
      name: 'notify_completion',
      toolName: 'create_notification',
      args: (ctx) => ({
        title: `Purchase Order Created: ${ctx.itemName}`,
        message: `Purchase order for ${ctx.itemName} (${ctx.quantity} ${ctx.unit}) has been fully processed.`,
        type: 'success',
        entityType: 'purchase',
        entityId: ctx._step_create_purchase_id,
        link: `/projects/${ctx.projectId}/purchases`,
      }),
      requiresPermission: 'notifications.create',
      description: 'Send purchase completion notification',
      progressLabel: 'Sending notification',
      dependsOn: ['_step_create_purchase_id'],
      optional: true,
    },
    {
      name: 'deduct_treasury',
      toolName: 'create_fund_transaction',
      args: (ctx) => ({
        fundId: ctx.fundId,
        type: 'deduct',
        amount: Number(ctx.quantity) * Number(ctx.unitPrice),
        category: 'purchase',
        description: `Purchase: ${ctx.itemName} (${ctx.quantity} ${ctx.unit})`,
      }),
      requiresPermission: 'fund-transactions.create',
      description: 'Deduct amount from project treasury',
      progressLabel: 'Updating treasury',
      dependsOn: ['fundId'],
      condition: (ctx) => !!ctx.fundId,
    },
  ];

  validateContext(context: Record<string, any>): string[] {
    const missing: string[] = [];
    if (!context.itemName) missing.push('itemName (Item name)');
    if (!context.quantity) missing.push('quantity (Quantity)');
    if (!context.unit) missing.push('unit (Unit)');
    if (!context.unitPrice) missing.push('unitPrice (Unit price)');
    if (!context.projectId) missing.push('projectId (Project ID)');
    return missing;
  }

  getRequiredFields(): string[] {
    return ['itemName', 'quantity', 'unit', 'unitPrice', 'projectId'];
  }
}
