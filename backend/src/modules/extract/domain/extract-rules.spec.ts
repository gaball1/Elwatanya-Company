import { describe, expect, it } from 'vitest';
import {
  calcExtractItem,
  getPreviousQuantitiesFromExtracts,
  nextRunningNumber,
  validateExtractItems,
} from './extract-rules';

const running = (runningNumber: number, totals: Record<string, number>) => ({
  status: 'running' as const,
  runningNumber,
  items: Object.entries(totals).map(([itemCode, total]) => ({ itemCode, total })),
});

describe('calcExtractItem', () => {
  it('computes total = previous + current and derived values', () => {
    const item = calcExtractItem({
      itemCode: 'A',
      description: 'Item',
      unit: 'm',
      contractQuantity: 100,
      previous: 50,
      current: 50,
      executionPercent: 100,
      unitPrice: 10,
    });
    expect(item.total).toBe(100);
    expect(item.executedQuantity).toBe(100);
    expect(item.workValue).toBe(1000);
  });
});

describe('getPreviousQuantitiesFromExtracts', () => {
  const extracts = [
    running(1, { A: 50, B: 20 }),
    running(2, { A: 100, B: 40 }),
  ];

  it('returns the immediately-previous running extract totals (جاري2 → جاري1)', () => {
    const previous = getPreviousQuantitiesFromExtracts(extracts, 'running', 2);
    expect(previous).toEqual({ A: 50, B: 20 });
  });

  it('accumulates through totals (جاري3 previous = جاري2 total)', () => {
    const previous = getPreviousQuantitiesFromExtracts(extracts, 'running', 3);
    expect(previous).toEqual({ A: 100, B: 40 });
  });

  it('returns {} for the first running extract', () => {
    expect(getPreviousQuantitiesFromExtracts(extracts, 'running', 1)).toEqual({});
  });

  it('returns {} when status is final', () => {
    expect(getPreviousQuantitiesFromExtracts(extracts, 'final', 2)).toEqual({});
  });

  it('returns {} when no previous running extract exists', () => {
    expect(getPreviousQuantitiesFromExtracts([running(5, { A: 10 })], 'running', 3)).toEqual({});
  });
});

describe('nextRunningNumber', () => {
  it('increments the max running number', () => {
    expect(nextRunningNumber([running(1, {}), running(2, {})])).toBe(3);
  });

  it('starts at 1 when no running extracts exist', () => {
    expect(nextRunningNumber([])).toBe(1);
  });

  it('ignores final extracts', () => {
    expect(
      nextRunningNumber([
        running(1, {}),
        { status: 'final' as const, runningNumber: 9 },
      ]),
    ).toBe(2);
  });
});

describe('validateExtractItems', () => {
  const assigned = [{ itemCode: 'A', assignedQuantity: 100 }];

  it('rejects an extract with no executed quantity', () => {
    const items = [calcExtractItem({ itemCode: 'A', description: '', unit: 'm', contractQuantity: 100, previous: 0, current: 0, executionPercent: 100, unitPrice: 1 })];
    expect(validateExtractItems(items, assigned).ok).toBe(false);
  });

  it('rejects when total exceeds the assigned quantity', () => {
    const items = [calcExtractItem({ itemCode: 'A', description: '', unit: 'm', contractQuantity: 100, previous: 60, current: 50, executionPercent: 100, unitPrice: 1 })];
    const result = validateExtractItems(items, assigned);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('تتجاوز');
  });

  it('allows an extract exactly at the assigned quantity', () => {
    const items = [calcExtractItem({ itemCode: 'A', description: '', unit: 'm', contractQuantity: 100, previous: 50, current: 50, executionPercent: 100, unitPrice: 1 })];
    expect(validateExtractItems(items, assigned)).toEqual({ ok: true });
  });

  it('rejects negative current quantities', () => {
    const items = [calcExtractItem({ itemCode: 'A', description: '', unit: 'm', contractQuantity: 100, previous: 0, current: -5, executionPercent: 100, unitPrice: 1 })];
    expect(validateExtractItems(items, assigned).ok).toBe(false);
  });
});
