import { describe, expect, it } from 'vitest';
import { Purchase } from './purchase.entity';

function validInput(over: Partial<Parameters<typeof Purchase.create>[0]> = {}) {
  return {
    projectId: 'project-1',
    buildingId: 'building-1',
    itemName: 'اسمنت',
    quantity: 10,
    unit: 'طن',
    unitPrice: 250.5,
    date: new Date('2026-01-01'),
    invoiceFile: 'invoice-abc.pdf',
    supplierName: 'مورد',
    createdBy: 'user-1',
    categoryId: 'cat-1',
    ...over,
  };
}

describe('Purchase.create', () => {
  it('creates a pending purchase with rounded total', () => {
    const r = Purchase.create(validInput({ quantity: 3, unitPrice: 0.1 }));
    expect(r.isSuccess).toBe(true);
    const p = r.getValue();
    expect(p.status).toBe('pending');
    expect(p.isDeleted).toBe(false);
    expect(p.total).toBe(0.3);
  });

  it('rejects missing item name', () => {
    const r = Purchase.create(validInput({ itemName: '' }));
    expect(r.isFailure).toBe(true);
    expect(r.error?.message).toContain('Item name');
  });

  it('rejects non-positive quantity', () => {
    expect(Purchase.create(validInput({ quantity: 0 })).isFailure).toBe(true);
    expect(Purchase.create(validInput({ quantity: -5 })).isFailure).toBe(true);
  });

  it('rejects negative unit price', () => {
    expect(Purchase.create(validInput({ unitPrice: -1 })).isFailure).toBe(true);
  });

  it('rejects empty unit', () => {
    expect(Purchase.create(validInput({ unit: '' })).isFailure).toBe(true);
  });

  it('rejects missing invoice file (mandatory invoice)', () => {
    const r = Purchase.create(validInput({ invoiceFile: '' }));
    expect(r.isFailure).toBe(true);
    expect(r.error?.message).toContain('Invoice file');
  });
});

describe('Purchase status workflow', () => {
  it('approve: pending -> approved; received is guarded', () => {
    const p = Purchase.create(validInput()).getValue();
    expect(p.approve().isSuccess).toBe(true);
    expect(p.status).toBe('approved');
    expect(p.markReceived().isSuccess).toBe(true);
    expect(p.status).toBe('received');
  });

  it('cannot receive before approval', () => {
    const p = Purchase.create(validInput()).getValue();
    expect(p.markReceived().isFailure).toBe(true);
    expect(p.status).toBe('pending');
  });

  it('cannot approve a cancelled or received purchase', () => {
    const p = Purchase.create(validInput()).getValue();
    p.cancel();
    expect(p.approve().isFailure).toBe(true);

    const p2 = Purchase.create(validInput()).getValue();
    p2.approve();
    p2.markReceived();
    expect(p2.approve().isFailure).toBe(true);
    expect(p2.markReceived().isFailure).toBe(true);
  });

  it('cancel: allowed from pending, approved, and received (with reversal by caller)', () => {
    const fromPend = Purchase.create(validInput()).getValue();
    expect(fromPend.cancel().isSuccess).toBe(true);
    expect(fromPend.status).toBe('cancelled');
    expect(fromPend.cancel().isFailure).toBe(true); // idempotence guard

    const fromReceived = Purchase.create(validInput()).getValue();
    fromReceived.approve();
    fromReceived.markReceived();
    expect(fromReceived.cancel().isSuccess).toBe(true);
    expect(fromReceived.status).toBe('cancelled');
  });
});

describe('Purchase.linkInventoryItem / update', () => {
  it('links an inventory item after receipt', () => {
    const p = Purchase.create(validInput()).getValue();
    expect(p.linkInventoryItem('  ').isFailure).toBe(true);
    expect(p.linkInventoryItem('item-1').isSuccess).toBe(true);
    expect(p.inventoryItemId).toBe('item-1');
  });

  it('recomputes total on update', () => {
    const p = Purchase.create(validInput({ quantity: 2, unitPrice: 10 })).getValue();
    p.update({ quantity: 4, unitPrice: 5 });
    expect(p.total).toBe(20);
  });

  it('blocks mutations on a deleted purchase', () => {
    const p = Purchase.create(validInput()).getValue();
    p.softDelete();
    expect(p.isDeleted).toBe(true);
    expect(p.update({}).isFailure).toBe(true);
    expect(p.approve().isFailure).toBe(true);
    expect(p.softDelete().isFailure).toBe(true);
  });
});
