import { Injectable } from '@nestjs/common';
import { BaseWorkflow, WorkflowStep, WorkflowPhase } from './base.workflow';

/**
 * Knowledge Fusion Workflow
 * Combines ERP data + Knowledge Base + BI Analytics to answer complex questions
 * like "Why is Project Cairo Tower losing money?"
 */
@Injectable()
export class KnowledgeFusionWorkflow extends BaseWorkflow {
  readonly name = 'knowledge_fusion';
  readonly description = 'Deep analysis combining ERP data, knowledge documents, and BI metrics to answer complex questions about project performance, costs, and issues';
  readonly requiredPermissions = ['projects.read'];
  readonly steps: WorkflowStep[] = [
    // Phase 1: Gather ERP Data
    {
      name: 'get_project',
      toolName: 'get_project',
      args: (ctx) => ({ projectId: ctx.projectId }),
      description: 'Get project details',
      dependsOn: ['projectId'],
    },
    {
      name: 'get_project_timeline',
      toolName: 'get_entity_timeline',
      args: (ctx) => ({ entityType: 'project', entityId: ctx.projectId, limit: 100 }),
      description: 'Get project timeline',
      dependsOn: ['projectId'],
    },
    {
      name: 'get_project_kpi',
      toolName: 'get_kpi',
      args: (ctx) => ({ projectId: ctx.projectId }),
      description: 'Get project KPIs',
      dependsOn: ['projectId'],
    },
    {
      name: 'list_project_purchases',
      toolName: 'list_purchases',
      args: (ctx) => ({ projectId: ctx.projectId }),
      description: 'List project purchases',
      dependsOn: ['projectId'],
      optional: true,
    },
    {
      name: 'list_project_extracts',
      toolName: 'list_extracts',
      args: (ctx) => ({ projectId: ctx.projectId }),
      description: 'List project extracts',
      dependsOn: ['projectId'],
      optional: true,
    },
    {
      name: 'list_project_funds',
      toolName: 'list_project_funds',
      args: (ctx) => ({ projectId: ctx.projectId }),
      description: 'List project fund transactions',
      dependsOn: ['projectId'],
      optional: true,
    },

    // Phase 2: Gather Knowledge
    {
      name: 'search_contracts',
      toolName: 'search_knowledge',
      args: (ctx) => ({
        query: `${ctx.projectName || ctx.projectId} contract terms conditions`,
        documentType: 'contract',
        limit: 3,
      }),
      description: 'Search for project contracts in knowledge base',
      dependsOn: ['projectId'],
      optional: true,
    },
    {
      name: 'search_specs',
      toolName: 'search_knowledge',
      args: (ctx) => ({
        query: `${ctx.projectName || ctx.projectId} specifications boq`,
        limit: 3,
      }),
      description: 'Search for project specifications',
      dependsOn: ['projectId'],
      optional: true,
    },

    // Phase 3: BI Analytics
    {
      name: 'get_project_trends',
      toolName: 'get_trends',
      args: (ctx) => ({ projectId: ctx.projectId }),
      description: 'Get project trend data',
      dependsOn: ['projectId'],
      optional: true,
    },
    {
      name: 'get_project_forecast',
      toolName: 'get_forecast',
      args: (ctx) => ({ projectId: ctx.projectId }),
      description: 'Get project forecast',
      dependsOn: ['projectId'],
      optional: true,
    },
  ];

  readonly phases: WorkflowPhase[] = [
    {
      name: 'erp_data',
      description: 'Gather ERP data (project, timeline, purchases, extracts, treasury)',
      steps: ['get_project', 'get_project_timeline', 'get_project_kpi', 'list_project_purchases', 'list_project_extracts', 'list_project_funds'],
    },
    {
      name: 'knowledge',
      description: 'Search knowledge base for contracts and specifications',
      steps: ['search_contracts', 'search_specs'],
    },
    {
      name: 'bi_analytics',
      description: 'Analyze trends and generate forecasts',
      steps: ['get_project_trends', 'get_project_forecast'],
    },
  ];

  validateContext(context: Record<string, any>): string[] {
    const missing: string[] = [];
    if (!context.projectId && !context.projectName) missing.push('projectId or projectName (the project to analyze)');
    return missing;
  }

  getRequiredFields(): string[] {
    return ['projectId or projectName'];
  }
}
