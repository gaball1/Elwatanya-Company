import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { ToolResult } from '../dto/agent-response.dto';

@Injectable()
export class ProjectSummaryTool extends BaseTool {
  readonly name = 'project_summary';
  readonly description = 'Get a summary of all projects with counts by status';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: any, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/projects', user.token);
    const projects = data?.data?.items || data?.data?.projects || [];
    const total = projects.length;
    const active = projects.filter((p: any) => p.status === 'active').length;
    const completed = projects.filter((p: any) => p.status === 'completed').length;
    const onHold = projects.filter((p: any) => p.status === 'on_hold').length;
    return this.success({ total, active, completed, onHold });
  }
}

@Injectable()
export class EmployeeStatsTool extends BaseTool {
  readonly name = 'employee_stats';
  readonly description = 'Get employee statistics (total, active, inactive)';
  readonly requiresPermission = 'employees.read';
  readonly requiredEntity = 'employee';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: any, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/employees', user.token);
    const employees = data?.data?.items || [];
    const total = employees.length;
    const active = employees.filter((e: any) => e.status === 'active').length;
    const inactive = employees.filter((e: any) => e.status === 'inactive').length;
    return this.success({ total, active, inactive });
  }
}

@Injectable()
export class PendingApprovalsSummaryTool extends BaseTool {
  readonly name = 'pending_approvals_summary';
  readonly description = 'Get summary of pending approvals grouped by entity type';
  readonly requiresPermission = 'approvals.read';
  readonly requiredEntity = 'approval';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: any, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/approvals?status=pending', user.token);
    const approvals = data?.data?.items || [];
    const byType: Record<string, number> = {};
    for (const a of approvals) {
      byType[a.entityType] = (byType[a.entityType] || 0) + 1;
    }
    return this.success({ total: approvals.length, byType });
  }
}

@Injectable()
export class FundSummaryTool extends BaseTool {
  readonly name = 'fund_summary';
  readonly description = 'Get project fund summary with total budget and remaining';
  readonly requiresPermission = 'project-funds.read';
  readonly requiredEntity = 'fund';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: any, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/project-funds', user.token);
    const funds = data?.data?.items || [];
    const totalBudget = funds.reduce((s: number, f: any) => s + (f.budget || f.totalBudget || 0), 0);
    const totalSpent = funds.reduce((s: number, f: any) => s + (f.spent || 0), 0);
    return this.success({
      totalFunds: funds.length,
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
    });
  }
}

@Injectable()
export class InventorySummaryTool extends BaseTool {
  readonly name = 'inventory_summary';
  readonly description = 'Get inventory summary with low stock items count';
  readonly requiresPermission = 'inventory.read';
  readonly requiredEntity = 'inventory';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: any, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/inventory-items', user.token);
    const items = data?.data?.items || [];
    const totalItems = items.length;
    const lowStock = items.filter((i: any) => i.quantity <= i.minQuantity).length;
    const totalValue = items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.price || 0), 0);
    return this.success({ totalItems, lowStock, totalValue });
  }
}
