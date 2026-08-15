import { describe, expect, it, vi } from 'vitest';
import { PurchaseStockService, StockInContext } from './purchase-stock.service';

function ctx(over: Partial<StockInContext> = {}): StockInContext {
  return {
    itemName: 'اسمنت',
    quantity: 100,
    unit: 'كيس',
    unitPrice: 20,
    supplierName: 'مورد أ',
    createdBy: 'user-1',
    date: new Date('2026-01-02'),
    purchaseId: 'purc-12345678-abcd',
    warehouseId: 'wh-test-001',
    ...over,
  };
}

function fakeTx(over: Record<string, unknown> = {}) {
  return {
    inventoryItem: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async (_data?: any) => ({ id: 'item-new', quantity: 0, avgCost: 0 })),
      update: vi.fn(async (_data?: any) => null),
    },
    stockMovement: {
      create: vi.fn(async (_data?: any) => null),
    },
    purchase: {
      findUnique: vi.fn(async () => ({ inventoryItemId: 'item-linked' })),
    },
    warehouse: {
      findUnique: vi.fn(async () => ({ id: 'wh-test-001', projectId: 'project-1' })),
    },
    ...over,
  };
}

function makeService() {
  return new PurchaseStockService({} as any);
}

describe('PurchaseStockService.stockIn', () => {
  it('reuses an existing item matched by normalized name and updates avg cost', async () => {
    const s = makeService();
    const update = vi.fn(async (_data?: any) => null);
    const movement = vi.fn(async (_data?: any) => null);
    const tx = fakeTx({
      inventoryItem: {
        findFirst: vi.fn(async () => ({
          id: 'item-1',
          // normalized name deliberately differs in spacing/case to prove dedupe
          nameNorm: 'اسمنت',
          quantity: 50,
          avgCost: 10,
        })),
        findUnique: vi.fn(async (_data?: any) => null),
        create: vi.fn(async (_data?: any) => null),
        update,
      },
      stockMovement: { create: movement },
    });

    const id = await s.stockIn(ctx(), tx as any);

    expect(tx.inventoryItem.findFirst).toHaveBeenCalledWith({
      where: { nameNorm: 'اسمنت', warehouseId: 'wh-test-001', deletedAt: null },
    });
    expect(id).toBe('item-1');
    const updateArgs = update.mock.calls[0][0].data;
    expect(Number(updateArgs.quantity)).toBe(150); // 50 + 100
    expect(Number(updateArgs.avgCost)).toBeCloseTo(16.66666, 3); // moving average
    expect(movement.mock.calls[0][0].data.type).toBe('RECEIVE');
    expect(movement.mock.calls[0][0].data.reference).toContain('GRN-');
  });

  it('auto-creates a new inventory item when no normalized-name match exists', async () => {
    const s = makeService();
    const create = vi.fn(async (_data?: any) => ({ id: 'item-new', quantity: 0, avgCost: 0 }));
    const update = vi.fn(async (_data?: any) => null);
    const tx = fakeTx({
      inventoryItem: {
        findFirst: vi.fn(async () => null),
        findUnique: vi.fn(async () => null),
        create,
        update,
      },
    });

    const id = await s.stockIn(ctx({ itemName: '  حديد  تسليح ' }), tx as any);

    expect(id).toBe('item-new');
    const createData = create.mock.calls[0][0].data;
    expect(createData.name).toBe('  حديد  تسليح ');
    expect(createData.nameNorm).toBe('حديد تسليح');
    expect(createData.quantity).toBe(0); // not double-counted
  });

  it('keeps trying until it finds a globally-unique inventory code', async () => {
    const s = makeService();
    let codeChecks = 0;
    const findFirst = vi.fn(async (args: any) => {
      if (args.where?.nameNorm) return null; // no name match -> auto-create path
      codeChecks += 1;
      return codeChecks < 3 ? { id: 'x' } : null; // first two codes collide
    });
    const tx = fakeTx({
      inventoryItem: {
        findFirst,
        create: vi.fn(async (_data?: any) => ({ id: 'item-new', quantity: 0, avgCost: 0 })),
        update: vi.fn(async (_data?: any) => null),
      },
      warehouse: { findUnique: vi.fn(async () => ({ id: 'wh-test-001', projectId: 'project-1' })) },
    });

    await s.stockIn(ctx(), tx as any);
    expect(codeChecks).toBe(3);
  });
});

describe('PurchaseStockService.reverseStockIn', () => {
  it('no-ops when the purchase was never linked to an inventory item', async () => {
    const s = makeService();
    const tx = fakeTx({ purchase: { findUnique: vi.fn(async () => null) } });
    await expect(s.reverseStockIn(ctx(), tx as any)).resolves.toBeUndefined();
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
  });

  it('decrements on-hand quantity (floored at zero) and records an ISSUE reversal', async () => {
    const s = makeService();
    const update = vi.fn(async (_data?: any) => null);
    const movement = vi.fn(async (_data?: any) => null);
    const tx = fakeTx({
      inventoryItem: {
        findFirst: vi.fn(async () => ({ id: 'item-linked', quantity: 40 })),
        update,
      },
      stockMovement: { create: movement },
    });

    await s.reverseStockIn(ctx({ quantity: 100 }), tx as any);

    const updated = update.mock.calls[0][0].data;
    expect(Number(updated.quantity)).toBe(0); // 40 - 100 floored to 0
    expect(movement.mock.calls[0][0].data.type).toBe('ISSUE');
    expect(movement.mock.calls[0][0].data.reference).toContain('REV-');
  });
});
