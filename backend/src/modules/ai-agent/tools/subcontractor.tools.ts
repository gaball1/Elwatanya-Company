import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { ToolResult } from '../dto/agent-response.dto';
import { ListContractorExtractsTool } from './erp-resolution.tools';

@Injectable()
export class ListSubcontractorsTool extends BaseTool {
  readonly name = 'list_subcontractors';
  readonly description = 'List all subcontractors';
  readonly requiresPermission = 'subcontractors.read';
  readonly requiredEntity = 'subcontractor';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(_args: any, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/subcontractors', user.token);
    return this.success(data?.data?.items || []);
  }
}

@Injectable()
export class CreateSubcontractorTool extends BaseTool {
  readonly name = 'create_subcontractor';
  readonly description = 'Create a new subcontractor';
  readonly requiresPermission = 'subcontractors.create';
  readonly requiredEntity = 'subcontractor';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: { name: string; workType: string; marginType?: string; marginValue?: number; phone?: string; email?: string; status?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.post('/api/v1/subcontractors', {
      name: args.name,
      workType: args.workType,
      marginType: args.marginType || 'PERCENTAGE',
      marginValue: args.marginValue || 0,
      phone: args.phone || '',
      email: args.email || '',
      status: (args.status || 'active').toLowerCase(),
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class AssignSubcontractorTool extends BaseTool {
  readonly name = 'assign_subcontractor';
  readonly description = 'Assign a subcontractor to a building';
  readonly requiresPermission = 'buildings.update';
  readonly requiredEntity = 'subcontractor';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: { buildingId: string; subcontractorId: string; workType?: string; agreedPrice?: number }, user: any): Promise<ToolResult> {
    const data = await this.api.post(`/api/v1/buildings/${args.buildingId}/subcontractors`, {
      subcontractorId: args.subcontractorId,
      workType: args.workType || 'general',
      agreedPrice: args.agreedPrice || 0,
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class CreateExtractTool extends BaseTool {
  readonly name = 'create_extract';
  readonly description = 'Create an extract for a subcontractor with items and deductions';
  readonly requiresPermission = 'extracts.create';
  readonly requiredEntity = 'extract';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: { buildingId: string; subcontractorId: string; date: string; insurancePercent: number; previousPaid: number; items: Array<{ itemId: string; quantity: number; price: number }>; manualDeductions?: Array<{ label: string; amount: number }>; status?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.post(`/api/v1/buildings/${args.buildingId}/contractors/${args.subcontractorId}/extracts`, {
      status: args.status || 'running',
      insurancePercent: args.insurancePercent,
      date: args.date,
      previousPaid: args.previousPaid,
      items: args.items,
      manualDeductions: args.manualDeductions || [],
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class ListExtractsTool extends ListContractorExtractsTool {
  readonly name = 'list_extracts';
  readonly description = 'List the extract history of a contractor, auto-resolving the project, buildings and contractor from context or names.';

  constructor(api: AgentHttpClient) {
    super(api);
  }
}
