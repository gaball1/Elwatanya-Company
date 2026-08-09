import { Injectable } from '@nestjs/common';
import { BaseWorkflow, WorkflowStep, WorkflowPhase } from './base.workflow';
import { ToolResult } from '../dto/agent-response.dto';
import { ExecutiveReportService } from '../executive/executive-report.service';

/**
 * Contractor Payment Analysis Workflow
 *
 * Answers questions like "Why hasn't contractor X been paid?" by composing
 * single-responsibility ERP tools:
 *   find_project -> list_project_buildings -> find_contractor
 *   -> list_contractor_extracts -> list_extract_approvals -> list_extract_payments
 *   -> treasury / purchases context
 * and produces a structured executive report.
 *
 * All entities are resolved automatically from conversation context or names —
 * no manual IDs required.
 */
@Injectable()
export class ContractorPaymentAnalysisWorkflow extends BaseWorkflow {
  readonly name = 'contractor_payment_analysis';
  readonly description = 'Deep contractor payment analysis: extracts, approvals, payments, treasury and purchase impact';
  readonly requiredPermissions = ['projects.read', 'extracts.read', 'payments.read'];

  constructor(private readonly reporter: ExecutiveReportService) {
    super();
  }

  readonly steps: WorkflowStep[] = [
    {
      name: 'find_project',
      toolName: 'find_project',
      args: (ctx) => ({
        projectId: ctx.projectId || ctx.currentProjectId,
        projectName: ctx.projectName || ctx.currentProjectName,
        query: ctx.projectQuery,
      }),
      description: 'Identify the project',
      condition: (ctx) =>
        !!(ctx.projectId || ctx.currentProjectId || ctx.projectName || ctx.currentProjectName || ctx.projectQuery),
    },
    {
      name: 'list_buildings',
      toolName: 'list_project_buildings',
      args: (ctx) => ({ projectId: ctx.projectId || ctx.currentProjectId }),
      description: 'Identify the project buildings',
      dependsOn: ['projectId'],
    },
    {
      name: 'find_contractor',
      toolName: 'find_contractor',
      args: (ctx) => ({
        contractorId: ctx.contractorId || ctx.currentContractorId,
        contractorName: ctx.contractorName || ctx.currentContractorName,
        query: ctx.contractorQuery,
      }),
      description: 'Identify the contractor',
      condition: (ctx) =>
        !!(ctx.contractorId || ctx.currentContractorId || ctx.contractorName || ctx.currentContractorName || ctx.contractorQuery),
    },
    {
      name: 'list_contractor_extracts',
      toolName: 'list_contractor_extracts',
      args: (ctx) => ({
        projectId: ctx.projectId || ctx.currentProjectId,
        contractorId: ctx.contractorId || ctx.currentContractorId,
        contractorName: ctx.contractorName || ctx.currentContractorName,
      }),
      description: 'Get the contractor extract history',
      condition: (ctx) =>
        !!(ctx.contractorId || ctx.currentContractorId || ctx.contractorName || ctx.currentContractorName),
    },
    {
      name: 'list_extract_approvals',
      toolName: 'list_extract_approvals',
      args: (ctx) => ({
        extractIds: (ctx._extracts || []).map((e: any) => e.id),
        projectId: ctx.projectId || ctx.currentProjectId,
        contractorId: ctx.contractorId || ctx.currentContractorId,
        contractorName: ctx.contractorName || ctx.currentContractorName,
      }),
      description: 'Check the extract approval records',
      dependsOn: ['_extracts'],
      optional: true,
    },
    {
      name: 'list_extract_payments',
      toolName: 'list_extract_payments',
      args: (ctx) => ({
        projectId: ctx.projectId || ctx.currentProjectId,
        contractorId: ctx.contractorId || ctx.currentContractorId,
        contractorName: ctx.contractorName || ctx.currentContractorName,
      }),
      description: 'Get the contractor payment records',
      condition: (ctx) =>
        !!(ctx.contractorId || ctx.currentContractorId || ctx.contractorName || ctx.currentContractorName),
    },
    {
      name: 'treasury_funds',
      toolName: 'list_project_funds',
      args: (ctx) => ({ projectId: ctx.projectId || ctx.currentProjectId }),
      description: 'Get treasury context',
      dependsOn: ['projectId'],
      optional: true,
    },
    {
      name: 'project_cashflow',
      toolName: 'get_cashflow',
      args: (ctx) => ({ projectId: ctx.projectId || ctx.currentProjectId }),
      description: 'Assess the financial impact on the project',
      dependsOn: ['projectId'],
      optional: true,
    },
  ];

  readonly phases: WorkflowPhase[] = [
    {
      name: 'resolve_entities',
      description: 'Resolve project and contractor from context',
      steps: ['find_project', 'list_buildings', 'find_contractor'],
    },
    {
      name: 'gather_records',
      description: 'Collect extracts, approvals and payments',
      steps: ['list_contractor_extracts', 'list_extract_approvals', 'list_extract_payments'],
    },
    {
      name: 'financial_context',
      description: 'Treasury and cash flow context',
      steps: ['treasury_funds', 'project_cashflow'],
    },
  ];

  validateContext(context: Record<string, any>): string[] {
    const missing: string[] = [];
    // The project is optional: without it the analysis runs contractor-wide
    // across all of the contractor's buildings/projects.
    const hasContractor =
      !!context.contractorId || !!context.currentContractorId || !!context.contractorName || !!context.currentContractorName;
    if (!hasContractor) missing.push('the contractor name (e.g. مقاولات الأهرام للبناء)');
    return missing;
  }

  getRequiredFields(): string[] {
    return ['contractor name'];
  }

  buildReport(results: ToolResult[], _context: Record<string, any>): string {
    // Each step emits a distinct data shape; locate them by their markers.
    const projectData = results.find((r) => r.success && r.data?.code && r.data?.name && !r.data?.totalNetPayable)?.data;
    const buildingsData = results.find((r) => r.success && r.data?.projectName && Array.isArray(r.data.items))?.data;
    const extractsData = results.find((r) => r.success && r.data?.totalNetPayable !== undefined)?.data;
    const approvalsData = results.find((r) => r.success && r.data?.extractIds)?.data;
    const paymentsData = results.find((r) => r.success && r.data?.totalPaid !== undefined)?.data;
    const treasuryData = results.find((r) => r.success && Array.isArray(r.data) && r.data.length >= 0)?.data;
    const cashflowData = results.find(
      (r) => r.success && r.data && (r.data.cashIn !== undefined || r.data.netCashFlow !== undefined || r.data.balance !== undefined),
    )?.data;

    const contractor = extractsData?.contractor || paymentsData?.contractor || null;
    const extracts = (extractsData?.items as any[]) || [];
    const approvals = (approvalsData?.items as any[]) || [];
    const payments = (paymentsData?.items as any[]) || [];
    const buildings = buildingsData?.items || extractsData?.buildings || [];

    return this.reporter.buildContractorPaymentReport({
      contractor,
      project: projectData ? { name: projectData.name, code: projectData.code, id: projectData.id } : null,
      buildings,
      extracts,
      approvals,
      payments,
      treasury: Array.isArray(treasuryData) ? treasuryData : [],
      purchases: [],
      cashflow: cashflowData || undefined,
    });
  }
}
