import { describe, expect, it, vi } from 'vitest';
import { StockEffectService, StockEffectError } from './stock-effect.service';

function fakeTx(over: Record<string, unknown> = {}) {
  return {
    inventoryItem: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async (_data?: any) => null),
    },
    ...over,
  };
}

function makeService() {
  return new StockEffectService();
}

describe('StockEffectService.applyCreate', () => {
  it('deducts quantity from the item on ISSUE', async () => {
    const s = makeService();
    const update = vi.fn(async (_data?: any) => null);
    const tx = fakeTx({
      inventoryItem: {
        findFirst: vi.fn(async () => ({ id: 'item-1', code: 'INV1', quantity: 100 })),
        update,
      },
    });

    await s.applyCreate(tx as any, { type: 'ISSUE', itemId: 'item-1', quantity: 30 });

    expect(Number(update.mock.calls[0][0].data.quantity)).toBe(70);
  });

  it('rejects an ISSUE larger than the available quantity', async () => {
    const s = makeService();
    const tx = fakeTx({
      inventoryItem: {
        findFirst: vi.fn(async () => ({ id: 'item-1', code: 'INV1', quantity: 10 })),
        update: vi.fn(async (_data?: any) => null),
      },
    });

    await expect(
      s.applyCreate(tx as any, { type: 'ISSUE', itemId: 'item-1', quantity: 15 }),
    ).rejects.toBeInstanceOf(StockEffectError);
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
  });

  it('adds quantity to the item on RECEIVE', async () => {
    const s = makeService();
    const update = vi.fn(async (_data?: any) => null);
    const tx = fakeTx({
      inventoryItem: {
        findFirst: vi.fn(async () => ({ id: 'item-1', code: 'INV1', quantity: 50 })),
        update,
      },
    });

    await s.applyCreate(tx as any, { type: 'RECEIVE', itemId: 'item-1', quantity: 25 });

    expect(Number(update.mock.calls[0][0].data.quantity)).toBe(75);
  });
});

describe('StockEffectService.reverse', () => {
  it('restores quantity on an ISSUE reversal', async () => {
    const s = makeService();
    const update = vi.fn(async (_data?: any) => null);
    const tx = fakeTx({
      inventoryItem: {
        findFirst: vi.fn(async () => ({ id: 'item-1', code: 'INV1', quantity: 70 })),
        update,
      },
    });

    await s.reverse(tx as any, { type: 'ISSUE', itemId: 'item-1', quantity: 30 });

    expect(Number(update.mock.calls[0][0].data.quantity)).toBe(100);
  });

  it('deducts quantity on a RECEIVE reversal and fails when stock is insufficient', async () => {
    const s = makeService();
    const tx = fakeTx({
      inventoryItem: {
        findFirst: vi.fn(async () => ({ id: 'item-1', code: 'INV1', quantity: 10 })),
        update: vi.fn(async (_data?: any) => null),
      },
    });

    await expect(
      s.reverse(tx as any, { type: 'RECEIVE', itemId: 'item-1', quantity: 15 }),
    ).rejects.toBeInstanceOf(StockEffectError);
  });
});
