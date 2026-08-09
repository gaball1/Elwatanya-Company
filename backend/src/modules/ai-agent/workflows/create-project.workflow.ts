import { Injectable } from '@nestjs/common';
import { BaseWorkflow, WorkflowStep, WorkflowPhase } from './base.workflow';

@Injectable()
export class CreateProjectWorkflow extends BaseWorkflow {
  readonly name = 'create_project';
  readonly description = 'Create a new construction project with buildings and budget setup';
  readonly requiredPermissions = ['projects.create', 'buildings.create', 'project-funds.create'];

  readonly phases: WorkflowPhase[] = [
    { name: 'project_details', description: 'Gather project information', steps: ['create_project'] },
    { name: 'building_setup', description: 'Configure buildings', steps: ['create_building'] },
    { name: 'budget_setup', description: 'Set up project budget', steps: ['create_fund', 'notify_completion'] },
  ];

  readonly steps: WorkflowStep[] = [
    {
      name: 'create_project',
      toolName: 'create_project',
      args: (ctx) => ({
        code: ctx.projectCode || `PRJ-${Date.now()}`,
        name: ctx.projectName,
        location: ctx.projectLocation,
        startDate: ctx.projectStartDate,
        client: ctx.clientName,
        description: ctx.projectDescription || `Project: ${ctx.projectName}`,
      }),
      requiresPermission: 'projects.create',
      description: 'Create the project record',
      progressLabel: 'Creating project',
      dependsOn: [],
    },
    {
      name: 'create_building',
      toolName: 'create_building',
      args: (ctx) => ({
        projectId: ctx._step_create_project_id,
        name: ctx.buildingName || `${ctx.projectName} - Main Building`,
        code: ctx.buildingCode || `BLD-${Date.now()}`,
        type: ctx.buildingType || 'RESIDENTIAL',
        startDate: ctx.projectStartDate,
        latitude: ctx.buildingLatitude,
        longitude: ctx.buildingLongitude,
        allowedRadius: ctx.buildingRadius ?? 100,
      }),
      requiresPermission: 'buildings.create',
      description: 'Create the first building under the project',
      progressLabel: 'Adding buildings',
      condition: () => true,
    },
    {
      name: 'notify_completion',
      toolName: 'create_notification',
      args: (ctx) => ({
        title: `Project Created: ${ctx.projectName}`,
        message: `Project "${ctx.projectName}" has been created with budget and buildings.`,
        type: 'success',
        entityType: 'project',
        entityId: ctx._step_create_project_id,
        link: `/projects/${ctx._step_create_project_id}`,
      }),
      requiresPermission: 'notifications.create',
      description: 'Send project creation notification',
      progressLabel: 'Sending notification',
      dependsOn: ['_step_create_project_id'],
      optional: true,
    },
    {
      name: 'create_fund',
      toolName: 'create_project_fund',
      args: (ctx) => ({
        projectId: ctx._step_create_project_id,
        name: `${ctx.projectName} - Budget`,
        budget: ctx.projectBudget || 0,
        description: ctx.budgetDescription || `Initial budget for ${ctx.projectName}`,
      }),
      requiresPermission: 'project-funds.create',
      description: 'Set up project budget/fund',
      progressLabel: 'Setting up budget',
      dependsOn: ['_step_create_project_id'],
    },
  ];

  validateContext(context: Record<string, any>): string[] {
    const missing: string[] = [];
    if (!context.projectName) missing.push('projectName (Project name)');
    if (!context.projectLocation) missing.push('projectLocation (Location)');
    if (!context.projectStartDate) missing.push('projectStartDate (Start date)');
    if (!context.clientName) missing.push('clientName (Client name)');
    return missing;
  }

  getRequiredFields(): string[] {
    return ['projectName', 'projectLocation', 'projectStartDate', 'clientName'];
  }
}
