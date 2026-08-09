import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { ToolResult } from '../dto/agent-response.dto';
import { pickBest } from './resolution.utils';

@Injectable()
export class ListSuppliersTool extends BaseTool {
  readonly name = 'list_suppliers';
  readonly description = 'List all suppliers, optionally filtered by name (partial/Arabic-aware)';
  readonly requiresPermission = 'suppliers.read';
  readonly requiredEntity = 'supplier';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: { name?: string; query?: string; supplierName?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/suppliers', user.token);
    let items = data?.data?.items || data?.items || [];
    const wanted = args.name || args.query || args.supplierName;
    if (wanted) {
      const best = pickBest(items, wanted, (s: any) => `${s.name} ${s.contactPerson || ''}`, 0.5);
      items = best ? [best] : [];
    }
    return this.success(items);
  }
}

@Injectable()
export class CreateSupplierTool extends BaseTool {
  readonly name = 'create_supplier';
  readonly description = 'Create a new supplier';
  readonly requiresPermission = 'suppliers.create';
  readonly requiredEntity = 'supplier';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: { name: string; contactPerson?: string; phone: string; email?: string; status?: string; products?: string[] }, user: any): Promise<ToolResult> {
    const data = await this.api.post('/api/v1/suppliers', {
      name: args.name,
      contactPerson: args.contactPerson || '',
      phone: args.phone,
      email: args.email || '',
      status: (args.status || 'active').toLowerCase(),
      products: args.products || [],
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class ListClientsTool extends BaseTool {
  readonly name = 'list_clients';
  readonly description = 'List all clients';
  readonly requiresPermission = 'clients.read';
  readonly requiredEntity = 'client';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(_args: any, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/clients', user.token);
    return this.success(data?.data?.items || data?.items || []);
  }
}

@Injectable()
export class CreateClientTool extends BaseTool {
  readonly name = 'create_client';
  readonly description = 'Create a new client';
  readonly requiresPermission = 'clients.create';
  readonly requiredEntity = 'client';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: { name: string; email?: string; phone?: string; status?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.post('/api/v1/clients', {
      name: args.name,
      email: args.email || '',
      phone: args.phone || '',
      status: (args.status || 'active').toLowerCase(),
    }, user.token);
    return this.success(data?.data || data);
  }
}
