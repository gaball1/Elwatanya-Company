import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { ToolResult } from '../dto/agent-response.dto';
import { ListExtractPaymentsTool } from './erp-resolution.tools';
import { schema, projectRefProps, statusProps } from './tool-schemas';

@Injectable()
export class ListProjectFundsTool extends BaseTool {
  readonly name = 'list_project_funds';
  readonly description = 'List all project funds (budget, balance, project), optionally filtered by project';
  readonly requiresPermission = 'project-funds.read';
  readonly requiredEntity = 'project-fund';
  readonly parameters = schema({ ...projectRefProps });

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { projectId?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/project-funds', user.token);
    let funds = data?.data?.items || [];
    if (args.projectId) funds = funds.filter((f: any) => f.projectId === args.projectId);
    return this.success(funds);
  }
}

@Injectable()
export class ListFundTransactionsTool extends BaseTool {
  readonly name = 'list_fund_transactions';
  readonly description = 'List fund transactions (deposits, withdrawals, payments), optionally filtered by fund';
  readonly requiresPermission = 'fund-transactions.read';
  readonly requiredEntity = 'fund-transaction';
  readonly parameters = schema({
    fundId: { type: 'string', description: 'Fund UUID (rarely needed).' },
  });

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { fundId?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/fund-transactions', user.token);
    let items = data?.data?.items || [];
    if (args.fundId) items = items.filter((t: any) => t.fundId === args.fundId);
    return this.success(items);
  }
}

@Injectable()
export class ListPurchasesTool extends BaseTool {
  readonly name = 'list_purchases';
  readonly description = 'List purchase orders, optionally filtered by status or by whether they have been received into inventory';
  readonly requiresPermission = 'purchases.read';
  readonly requiredEntity = 'purchase';
  readonly parameters = schema({
    ...statusProps,
    received: {
      type: 'boolean',
      description: 'true = received into inventory, false = still awaiting delivery/receipt (e.g. "المشتريات اللي لسه مستلمناهاش").',
    },
    ...projectRefProps,
  });

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { status?: string }, user: any): Promise<ToolResult> {
    const query = args.status ? `?status=${args.status}` : '';
    const data = await this.api.get(`/api/v1/purchases${query}`, user.token);
    return this.success(data?.data?.items || []);
  }
}

@Injectable()
export class CreatePurchaseTool extends BaseTool {
  readonly name = 'create_purchase';
  readonly description = 'Create a new purchase order';
  readonly requiresPermission = 'purchases.create';
  readonly requiredEntity = 'purchase';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { projectId: string; itemName: string; quantity: number; unit: string; unitPrice: number; total: number; date: string; status?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.post('/api/v1/purchases', {
      projectId: args.projectId,
      itemName: args.itemName,
      quantity: args.quantity,
      unit: args.unit,
      unitPrice: args.unitPrice,
      total: args.total,
      date: args.date,
      status: (args.status || 'pending').toLowerCase(),
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class CreateProjectFundTool extends BaseTool {
  readonly name = 'create_project_fund';
  readonly description = 'Create a project fund/budget';
  readonly requiresPermission = 'project-funds.create';
  readonly requiredEntity = 'project-fund';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { projectId: string; name: string; budget: number; description?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.post('/api/v1/project-funds', {
      projectId: args.projectId,
      name: args.name,
      budget: args.budget,
      description: args.description || '',
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class CreateFundTransactionTool extends BaseTool {
  readonly name = 'create_fund_transaction';
  readonly description = 'Create a fund transaction (add/deduct)';
  readonly requiresPermission = 'fund-transactions.create';
  readonly requiredEntity = 'fund-transaction';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { fundId: string; type: 'add' | 'deduct' | 'request'; amount: number; category?: string; description?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.post('/api/v1/fund-transactions', {
      fundId: args.fundId,
      type: args.type,
      amount: args.amount,
      category: args.category || 'general',
      description: args.description || '',
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class UpdatePurchaseTool extends BaseTool {
  readonly name = 'update_purchase';
  readonly description = 'Update a purchase order (attach supplier, update notes, etc.)';
  readonly requiresPermission = 'purchases.update';
  readonly requiredEntity = 'purchase';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { id: string; itemName?: string; quantity?: number; unit?: string; unitPrice?: number; date?: string; notes?: string; supplierId?: string; status?: string }, user: any): Promise<ToolResult> {
    if (!args.id) return this.fail('id is required. Please provide the purchase ID to update.');
    const body: Record<string, any> = {};
    if (args.itemName !== undefined) body.itemName = args.itemName;
    if (args.quantity !== undefined) body.quantity = args.quantity;
    if (args.unit !== undefined) body.unit = args.unit;
    if (args.unitPrice !== undefined) body.unitPrice = args.unitPrice;
    if (args.date !== undefined) body.date = args.date;
    if (args.notes !== undefined) body.notes = args.notes;
    if (args.supplierId !== undefined) body.supplierId = args.supplierId;
    if (args.status !== undefined) body.status = args.status;
    const data = await this.api.patch(`/api/v1/purchases/${args.id}`, body, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class ListPaymentsTool extends ListExtractPaymentsTool {
  readonly name = 'list_payments';
  readonly description = 'List payment records made to a contractor, auto-resolving the project, buildings and contractor from context or names.';

  constructor(api: AgentHttpClient) {
    super(api);
  }
}
