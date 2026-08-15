import { describe, expect, it, vi } from 'vitest';
import { UpdatePurchaseStatusUseCase } from './update-purchase-status.use-case';
import { Purchase } from '../../domain/purchase.entity';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

function buildPurchase(status: 'pending' | 'approved' | 'received' | 'cancelled') {
  const p = Purchase.create({
    projectId: 'project-1',
    itemName: 'اسمنت',
    quantity: 100,
    unit: 'كيس',
    unitPrice: 10,
    date: new Date('2026-01-01'),
    invoiceFile: 'inv.pdf',
    createdBy: 'user-1',
  }).getValue();
  if (status === 'approved' || status === 'received') p.approve();
  if (status === 'received') p.markReceived();
  if (status === 'cancelled') p.cancel();
  return p;
}

function makeUseCase(over: Record<string, unknown> = {}) {
  const purchase = 'purchase' in over ? over.purchase : buildPurchase('pending');
  const repo = {
    findById: vi.fn(async () => purchase),
    save: vi.fn(async () => undefined),
    transition: vi.fn(async (..._args: any[]) => true),
    ...(over.repo ?? {}),
  };
  const financial = {
    reverseExpense: vi.fn(async () => undefined),
    ...(over.financial ?? {}),
  };
  const prisma = {
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(over.tx ?? {})),
    ...(over.prisma ?? {}),
  };
  const notifications = {
    createForProjectMembers: vi.fn(async () => undefined),
    ...(over.notifications ?? {}),
  };
  const stock = {
    stockIn: vi.fn(async () => 'item-new'),
    reverseStockIn: vi.fn(async () => undefined),
    ...(over.stock ?? {}),
  };
  const uc = new UpdatePurchaseStatusUseCase(
    repo as any,
    financial as any,
    prisma as any,
    notifications as any,
    stock as any,
  );
  return { uc, repo, financial, notifications, stock, prisma };
}

const ID = new UniqueEntityId().toValue();

describe('UpdatePurchaseStatusUseCase', () => {
  it('marks a received purchase, stocks in, and links the inventory item', async () => {
    const purchase = buildPurchase('approved');
    const { uc, repo, stock, notifications } = makeUseCase({ purchase });

    const result = await uc.execute(ID, 'received', 'wh-1');

    expect(result.isSuccess).toBe(true);
    const transitionArgs = repo.transition.mock.calls[0];
    expect(transitionArgs[0]).toEqual(expect.any(String));
    expect(transitionArgs[1]).toEqual(['approved']);
    expect(transitionArgs[2]).toBe('received');
    expect(transitionArgs[3]).toBeTruthy();
    expect(stock.stockIn).toHaveBeenCalled();
    expect(purchase.inventoryItemId).toBe('item-new');
    expect(repo.save).toHaveBeenCalled();
    expect(notifications.createForProjectMembers).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ entityType: 'purchase' }),
    );
  });

  it('reverses stock and reverses the expense when cancelling a received purchase', async () => {
    const purchase = buildPurchase('received');
    const { uc, financial, stock, notifications } = makeUseCase({ purchase });

    const result = await uc.execute(ID, 'cancelled');

    expect(result.isSuccess).toBe(true);
    expect(stock.reverseStockIn).toHaveBeenCalled();
    expect(financial.reverseExpense).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-1', category: 'purchase' }),
      expect.anything(),
    );
    expect(purchase.status).toBe('cancelled');
    expect(notifications.createForProjectMembers).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ type: 'warning' }),
    );
  });

  it('fails and performs no side effects when the atomic transition is not possible', async () => {
    const purchase = buildPurchase('approved');
    const stock = { stockIn: vi.fn(async () => 'item-new') };
    const notifications = { createForProjectMembers: vi.fn(async () => undefined) };
    const { uc, repo } = makeUseCase({
      purchase,
      repo: { transition: vi.fn(async () => false) },
      stock,
      notifications,
    });

    const result = await uc.execute(ID, 'received', 'wh-1');

    expect(result.isFailure).toBe(true);
    expect(stock.stockIn).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(notifications.createForProjectMembers).not.toHaveBeenCalled();
  });

  it('fails fast with Purchase not found', async () => {
    const { uc } = makeUseCase({ purchase: null });
    const result = await uc.execute(ID, 'approved');
    expect(result.isFailure).toBe(true);
    expect(result.error?.message).toContain('Purchase not found');
  });
});
