import { Injectable } from '@nestjs/common';
import { BaseWorkflow, WorkflowStep, WorkflowPhase } from './base.workflow';

@Injectable()
export class ContractorOnboardingWorkflow extends BaseWorkflow {
  readonly name = 'contractor_onboarding';
  readonly description = 'Full contractor onboarding with project assignment and BOQ setup';
  readonly requiredPermissions = ['subcontractors.create', 'buildings.update'];

  readonly phases: WorkflowPhase[] = [
    { name: 'contractor_creation', description: 'Create subcontractor record', steps: ['create_subcontractor'] },
    { name: 'assignment', description: 'Assign to project building', steps: ['assign_to_building'] },
    { name: 'boq_setup', description: 'Configure contractor BOQ', steps: ['setup_boq', 'notify_completion'] },
  ];

  readonly steps: WorkflowStep[] = [
    {
      name: 'create_subcontractor',
      toolName: 'create_subcontractor',
      args: (ctx) => ({
        name: ctx.contractorName,
        workType: ctx.workType || 'general',
        marginType: ctx.marginType || 'PERCENTAGE',
        marginValue: ctx.marginValue ? Number(ctx.marginValue) : 0,
        phone: ctx.contractorPhone,
        email: ctx.contractorEmail,
        status: 'active',
      }),
      requiresPermission: 'subcontractors.create',
      description: 'Create the subcontractor record',
      progressLabel: 'Creating contractor record',
    },
    {
      name: 'assign_to_building',
      toolName: 'assign_subcontractor',
      args: (ctx) => ({
        buildingId: ctx.buildingId,
        subcontractorId: ctx._step_create_subcontractor_id,
        workType: ctx.workType || 'general',
        agreedPrice: ctx.agreedPrice ? Number(ctx.agreedPrice) : 0,
      }),
      requiresPermission: 'buildings.update',
      description: 'Assign contractor to project building',
      progressLabel: 'Assigning to building',
      dependsOn: ['_step_create_subcontractor_id', 'buildingId'],
    },
    {
      name: 'notify_completion',
      toolName: 'create_notification',
      args: (ctx) => ({
        title: `Contractor Onboarded: ${ctx.contractorName}`,
        message: `Contractor "${ctx.contractorName}" has been onboarded and assigned to building.`,
        type: 'success',
        entityType: 'subcontractor',
        entityId: ctx._step_create_subcontractor_id,
      }),
      requiresPermission: 'notifications.create',
      description: 'Send contractor onboarding notification',
      progressLabel: 'Sending notification',
      dependsOn: ['_step_create_subcontractor_id'],
      optional: true,
    },
    {
      name: 'setup_boq',
      toolName: 'create_subcontractor',
      args: (ctx) => ({
        id: ctx._step_create_subcontractor_id,
        status: 'active',
        // BOQ setup is handled via the contractor BOQ allocation system
      }),
      requiresPermission: 'subcontractors.create',
      description: 'Configure contractor BOQ parameters',
      progressLabel: 'Setting up BOQ',
      dependsOn: ['_step_create_subcontractor_id'],
      optional: true,
    },
  ];

  validateContext(context: Record<string, any>): string[] {
    const missing: string[] = [];
    if (!context.contractorName) missing.push('contractorName (Contractor name)');
    if (!context.buildingId) missing.push('buildingId (Building ID)');
    return missing;
  }

  getRequiredFields(): string[] {
    return ['contractorName', 'buildingId'];
  }
}
