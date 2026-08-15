import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { ToolResult } from '../dto/agent-response.dto';
import { pickBest } from './resolution.utils';
import { schema } from './tool-schemas';

@Injectable()
export class ListWarehousesTool extends BaseTool {
  readonly name = 'list_warehouses';
  readonly description = 'List all warehouses';
  readonly requiresPermission = 'warehouses.read';
  readonly requiredEntity = 'warehouse';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(_args: any, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/warehouses', user.token);
    return this.success(data?.items || data?.data?.items || []);
  }
}

@Injectable()
export class ListInventoryItemsTool extends BaseTool {
  readonly name = 'list_inventory_items';
  readonly description = 'List inventory items with available quantity and warehouse, optionally filtered by warehouse, category, or an item name/code (Arabic-aware). Use for "المخزن فيه X كام؟" (how much of X is in stock).';
  readonly requiresPermission = 'inventory.read';
  readonly requiredEntity = 'inventory-item';
  readonly parameters = schema({
    warehouseId: { type: 'string', description: 'Warehouse UUID (rarely needed — a name works).' },
    warehouseName: { type: 'string', description: 'Warehouse name, e.g. مخزن القاهرة.' },
    categoryId: { type: 'string', description: 'Inventory category UUID.' },
    itemName: { type: 'string', description: 'Item name or code, e.g. أسمنت, حديد.' },
    name: { type: 'string', description: 'Alias for itemName.' },
    query: { type: 'string', description: 'Free-text item name to match.' },
  });

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { warehouseId?: string; categoryId?: string; itemName?: string; name?: string; query?: string }, user: any): Promise<ToolResult> {
    const [itemsData, warehousesData] = await Promise.all([
      this.api.get('/api/v1/inventory-items', user.token),
      this.api.get('/api/v1/warehouses', user.token),
    ]);
    let items = itemsData?.items || itemsData?.data?.items || [];
    const warehouses = warehousesData?.items || warehousesData?.data?.items || [];
    const warehouseName = (id?: string) => (id ? warehouses.find((w: any) => w.id === id)?.name || '' : '');

    if (args.warehouseId) items = items.filter((i: any) => i.warehouseId === args.warehouseId);
    if (args.categoryId) items = items.filter((i: any) => i.categoryId === args.categoryId);

    const wantedName = args.itemName || args.name || args.query;
    if (wantedName) {
      const best = pickBest(items, wantedName, (i: any) => `${i.code} ${i.name}`, 0.5);
      items = best ? [best] : [];
    }

    const annotated = items.map((i: any) => ({ ...i, warehouseName: warehouseName(i.warehouseId) }));
    return this.success({ items: annotated, searchedName: wantedName || null, total: annotated.length });
  }
}

@Injectable()
export class CreateInventoryItemTool extends BaseTool {
  readonly name = 'create_inventory_item';
  readonly description = 'Create a new inventory item';
  readonly requiresPermission = 'inventory.create';
  readonly requiredEntity = 'inventory-item';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { code: string; name: string; categoryId: string; warehouseId: string; unit: string; quantity: number; minQuantity: number; price: number; status?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.post('/api/v1/inventory-items', {
      code: args.code,
      name: args.name,
      categoryId: args.categoryId,
      warehouseId: args.warehouseId,
      unit: args.unit,
      quantity: args.quantity,
      minQuantity: args.minQuantity,
      price: args.price,
      status: (args.status || 'active').toLowerCase(),
    }, user.token);
    return this.success(data?.data || data);
  }
}
