import { describe, expect, it } from 'vitest';
import {
  validateComponentsWithinBudget,
  sumComponentValues,
  validatePartialComponentDistribution,
  getAllocatedQty,
  isFinalItemCommitted,
  findCommittedDecreaseViolations,
  applyFinalItemQuantityUpdate,
  getComponentAllocatedQty,
  type FinalItemStateInput,
  type AnalyticalSourceItem,
} from './final-boq-rules';

describe('validateComponentsWithinBudget', () => {
  it('allows analysis total that equals the item total value', () => {
    const result = validateComponentsWithinBudget(50000, [
      { quantity: 100, unitPrice: 300 },
      { quantity: 100, unitPrice: 200 },
    ]);
    expect(result).toEqual({ ok: true });
  });

  it('allows analysis total below the item total value', () => {
    const result = validateComponentsWithinBudget(50000, [
      { quantity: 100, unitPrice: 100 },
      { quantity: 100, unitPrice: 150 },
    ]);
    expect(result).toEqual({ ok: true });
  });

  it('blocks analysis total that exceeds the item total value', () => {
    const result = validateComponentsWithinBudget(50000, [
      { quantity: 100, unitPrice: 400 },
      { quantity: 100, unitPrice: 200 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('يتجاوز');
    }
  });

  it('blocks when the sum of component unit prices exceeds the item unit price (analyze model)', () => {
    // Analyze uses item.quantity for every component, so the rule reduces to:
    // Σ unitPrice <= item.unitPrice (item: 100 × 500 = 50000)
    const itemTotal = 50000;
    const components = [
      { quantity: 100, unitPrice: 300 },
      { quantity: 100, unitPrice: 250 },
    ];
    expect(sumComponentValues(components)).toBe(55000);
    expect(validateComponentsWithinBudget(itemTotal, components).ok).toBe(false);
  });

  it('allows an empty component list', () => {
    expect(validateComponentsWithinBudget(50000, [])).toEqual({ ok: true });
  });
});

describe('validatePartialComponentDistribution', () => {
  it('allows partial distribution within the available quantity', () => {
    const result = validatePartialComponentDistribution(100, 40, [
      { contractorId: 'c1', quantity: 30 },
      { contractorId: 'c2', quantity: 20 },
    ]);
    expect(result).toEqual({ ok: true });
  });

  it('blocks distribution exceeding the available quantity', () => {
    const result = validatePartialComponentDistribution(100, 80, [
      { contractorId: 'c1', quantity: 30 },
    ]);
    expect(result.ok).toBe(false);
  });

  it('blocks zero or negative quantities', () => {
    const result = validatePartialComponentDistribution(100, 0, [
      { contractorId: 'c1', quantity: 0 },
    ]);
    expect(result.ok).toBe(false);
  });
});

describe('getAllocatedQty', () => {
  it('sums allocations by item code', () => {
    const allocations = [
      { contractorId: 'c1', contractorName: 'C1', itemCode: 'A', componentId: null, assignedQuantity: 10 },
      { contractorId: 'c2', contractorName: 'C2', itemCode: 'A', componentId: 'x', assignedQuantity: 20 },
      { contractorId: 'c3', contractorName: 'C3', itemCode: 'B', componentId: null, assignedQuantity: 99 },
    ];
    expect(getAllocatedQty(allocations, 'A')).toBe(30);
  });
});

describe('isFinalItemCommitted', () => {
  it('is false for a pending non-analyzed item', () => {
    expect(isFinalItemCommitted({ isAnalyzed: false, status: 'pending', componentCount: 0 })).toBe(false);
  });

  it('is true for an analyzed item with components', () => {
    expect(isFinalItemCommitted({ isAnalyzed: true, status: 'analyzed', componentCount: 2 })).toBe(true);
  });

  it('is true for a partially distributed item', () => {
    expect(isFinalItemCommitted({ isAnalyzed: false, status: 'partial', componentCount: 0 })).toBe(true);
  });

  it('is true for a fully distributed item', () => {
    expect(isFinalItemCommitted({ isAnalyzed: false, status: 'distributed', componentCount: 0 })).toBe(true);
  });

  it('treats null/undefined as not committed', () => {
    expect(isFinalItemCommitted(null)).toBe(false);
    expect(isFinalItemCommitted(undefined)).toBe(false);
  });
});

describe('findCommittedDecreaseViolations', () => {
  const analytical: AnalyticalSourceItem[] = [
    { itemCode: 'A', description: 'A', unit: 'u', quantity: 80, unitPrice: 10, totalValue: 800 },
    { itemCode: 'B', description: 'B', unit: 'u', quantity: 80, unitPrice: 10, totalValue: 800 },
    { itemCode: 'C', description: 'C', unit: 'u', quantity: 50, unitPrice: 10, totalValue: 500 },
  ];

  const current: FinalItemStateInput[] = [
    { itemCode: 'A', description: 'A', unit: 'u', quantity: 100, unitPrice: 10, totalValue: 1000, isAnalyzed: true, components: [{ id: 'c1', name: 'x', unit: 'u', quantity: 100, unitPrice: 10, totalValue: 1000 }], status: 'analyzed' },
    { itemCode: 'B', description: 'B', unit: 'u', quantity: 100, unitPrice: 10, totalValue: 1000, isAnalyzed: false, components: [], status: 'distributed' },
    { itemCode: 'C', description: 'C', unit: 'u', quantity: 50, unitPrice: 10, totalValue: 500, isAnalyzed: false, components: [], status: 'pending' },
  ];

  it('flags decreases on analyzed and distributed items', () => {
    const violations = findCommittedDecreaseViolations(analytical, current);
    expect(violations.map((v) => v.itemCode)).toEqual(['A', 'B']);
  });

  it('does not flag increases or unchanged committed items', () => {
    const analyticalInc: AnalyticalSourceItem[] = [
      { itemCode: 'A', description: 'A', unit: 'u', quantity: 120, unitPrice: 10, totalValue: 1200 },
      { itemCode: 'C', description: 'C', unit: 'u', quantity: 50, unitPrice: 10, totalValue: 500 },
    ];
    expect(findCommittedDecreaseViolations(analyticalInc, current)).toEqual([]);
  });
});

describe('applyFinalItemQuantityUpdate', () => {
  const allocations = [
    { contractorId: 'c1', contractorName: 'C1', itemCode: 'A', componentId: 'c1', assignedQuantity: 30 },
  ];

  it('blocks a decrease on an analyzed item (even with no allocations)', () => {
    const item: FinalItemStateInput = {
      itemCode: 'A', description: 'A', unit: 'u', quantity: 100, unitPrice: 10, totalValue: 1000,
      isAnalyzed: true, components: [{ id: 'c1', name: 'x', unit: 'u', quantity: 100, unitPrice: 10, totalValue: 1000 }], status: 'analyzed',
    };
    expect(applyFinalItemQuantityUpdate(item, 90, allocations)).toBeNull();
  });

  it('blocks a decrease on a distributed item', () => {
    const item: FinalItemStateInput = {
      itemCode: 'B', description: 'B', unit: 'u', quantity: 100, unitPrice: 10, totalValue: 1000,
      isAnalyzed: false, components: [], status: 'distributed',
    };
    expect(applyFinalItemQuantityUpdate(item, 80, allocations)).toBeNull();
  });

  it('allows an increase on an analyzed item and makes it available for distribution', () => {
    const item: FinalItemStateInput = {
      itemCode: 'A', description: 'A', unit: 'u', quantity: 100, unitPrice: 10, totalValue: 1000,
      isAnalyzed: true, components: [{ id: 'c1', name: 'x', unit: 'u', quantity: 100, unitPrice: 10, totalValue: 1000 }], status: 'analyzed',
    };
    const next = applyFinalItemQuantityUpdate(item, 150, allocations);
    expect(next).not.toBeNull();
    if (next) {
      expect(next.remainingQuantity).toBe(120);
      expect(getComponentAllocatedQty(allocations, 'A', 'c1')).toBe(30);
    }
  });

  it('allows a decrease on a pending non-analyzed item', () => {
    const item: FinalItemStateInput = {
      itemCode: 'C', description: 'C', unit: 'u', quantity: 100, unitPrice: 10, totalValue: 1000,
      isAnalyzed: false, components: [], status: 'pending',
    };
    expect(applyFinalItemQuantityUpdate(item, 60, allocations)).not.toBeNull();
  });
});
