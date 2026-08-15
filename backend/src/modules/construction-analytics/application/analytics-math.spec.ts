import { describe, it, expect } from 'vitest';
import {
  num,
  round2,
  clamp,
  sum,
  safeDiv,
  pctSafe,
  daysBetween,
  plannedPercent,
  employerBoqTotal,
  extractWorkValue,
  actualCostTotal,
  computeEarnedValue,
  computeProgress,
  classifyCostType,
  classifyItem,
  computeBoqBreakdown,
  computeBoqIntelligence,
} from './analytics-math';
import type { AnalyticsDataset, ContractorBoqItemRow, EmployerBoqItemRow } from '../domain/analytics.types';

function employerItem(over: Partial<EmployerBoqItemRow> = {}): EmployerBoqItemRow {
  return { buildingId: 'b1', itemCode: 'A', description: 'works', unit: 'no', quantity: 1, unitPrice: 100, totalValue: 100, ...over };
}

function emptyDataset(): AnalyticsDataset {  return {
    project: null,
    buildings: [],
    employerItems: [],
    analyticalItems: [],
    finalBoqItems: [],
    components: [],
    contractorBoqs: [],
    contractorBoqItems: [],
    statements: [],
    statementItems: [],
    payments: [],
    purchases: [],
    fund: null,
    fundTransactions: [],
    miscellaneous: [],
    inventoryItems: [],
    stockMovements: [],
    attendance: [],
    employees: [],
    departments: [],
    subcontractors: [],
    clientStatements: [],
    subcontractorStatements: [],
    pendingApprovals: 0,
  };
}

describe('utils', () => {
  it('num coerces decimals and strings', () => {
    expect(num(5)).toBe(5);
    expect(num('7.5')).toBe(7.5);
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
  });

  it('round2 rounds to 2 decimals', () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(10.004)).toBe(10.0);
  });

  it('clamp bounds values', () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('sum adds numbers', () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum([])).toBe(0);
  });

  it('safeDiv avoids divide by zero', () => {
    expect(safeDiv(10, 2)).toBe(5);
    expect(safeDiv(10, 0)).toBe(0);
    expect(safeDiv(10, 0, 1)).toBe(1);
  });

  it('pctSafe returns percent and zero fallback', () => {
    expect(pctSafe(25, 100)).toBe(25);
    expect(pctSafe(1, 0)).toBe(0);
  });

  it('daysBetween floors positive elapsed days', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-11');
    expect(daysBetween(from, to)).toBe(10);
    expect(daysBetween(to, from)).toBe(0);
  });
});

describe('classifyCostType', () => {
  it('classifies labor by unit and keyword', () => {
    expect(classifyCostType('Carpenter works', 'day')).toBe('labor');
    expect(classifyCostType('anything', 'hour')).toBe('labor');
    expect(classifyCostType('أعمال عامل', '')).toBe('labor');
  });

  it('classifies equipment by keyword and unit', () => {
    expect(classifyCostType('Crane rental', 'day-rental')).toBe('equipment');
    expect(classifyCostType('ونش رفع', '')).toBe('equipment');
  });

  it('defaults to material', () => {
    expect(classifyCostType('Cement supply', 'ton')).toBe('material');
    expect(classifyCostType('خرسانة', 'م3')).toBe('material');
  });
});

describe('classifyItem', () => {
  it('maps margins to buckets', () => {
    expect(classifyItem(30)).toBe('very_profitable');
    expect(classifyItem(12)).toBe('profitable');
    expect(classifyItem(0)).toBe('break_even');
    expect(classifyItem(-10)).toBe('loss');
    expect(classifyItem(-40)).toBe('critical_loss');
  });
});

describe('earned value', () => {
  it('computes BAC/EV/AC and derived metrics', () => {
    const ds = emptyDataset();
    ds.project = { id: 'p1', name: 'P1', code: 'C1', status: 'active', startDate: null, plannedDurationMonths: 24, progress: 50, client: null };
    ds.employerItems = [
      { buildingId: 'b1', itemCode: 'A', description: 'x', unit: 'no', quantity: 10, unitPrice: 100, totalValue: 1000 },
      { buildingId: 'b1', itemCode: 'B', description: 'y', unit: 'no', quantity: 10, unitPrice: 100, totalValue: 1000 },
    ];
    ds.statements = [
      { id: 's1', contractorBoqId: 'cb1', status: 'approved', sequenceNumber: 1, runningNumber: 1, netPayable: 900, totalWorkValue: 900, previousPaid: 0, extractDate: new Date(), label: null },
      { id: 's2', contractorBoqId: 'cb1', status: 'approved', sequenceNumber: 2, runningNumber: 2, netPayable: 700, totalWorkValue: 700, previousPaid: 0, extractDate: new Date(), label: null },
    ];
    ds.payments = [
      { id: 'p1', buildingId: null, contractorId: null, statementId: 's1', amount: 900, paidAt: new Date() },
      { id: 'p2', buildingId: null, contractorId: null, statementId: 's2', amount: 700, paidAt: new Date() },
    ];
    ds.purchases = [
      { id: 'pu1', projectId: 'p1', buildingId: null, supplierId: null, supplierName: null, itemName: 'steel', quantity: 1, unitPrice: 400, total: 400, status: 'received', date: new Date() },
      { id: 'pu2', projectId: 'p1', buildingId: null, supplierId: null, supplierName: null, itemName: 'cancelled', quantity: 1, unitPrice: 999, total: 999, status: 'cancelled', date: new Date() },
    ];
    ds.miscellaneous = [{ id: 'm1', projectId: 'p1', description: 'permits', amount: 100, category: 'permits', date: new Date() }];

    const ev = computeEarnedValue(ds);

    expect(ev.bac).toBe(2000);
    expect(ev.ev).toBe(1600);
    expect(ev.ac).toBe(2100); // 1600 paid + 400 received + 100 misc (cancelled excluded)
    expect(ev.pv).toBe(1000); // 50% of BAC
    expect(ev.cpi).toBe(0.76); // 1600/2100
    expect(ev.spi).toBe(1.6); // 1600/1000
    expect(ev.cv).toBe(-500);
    expect(ev.sv).toBe(600);
    expect(ev.vac).toBe(round2(2000 - ev.eac));
    expect(ev.plannedPercent).toBe(50);
    expect(ev.actualPercent).toBe(80);
  });
});

describe('progress', () => {
  it('aggregates executed value by building and category', () => {
    const ds = emptyDataset();
    ds.project = { id: 'p1', name: 'P1', code: 'C1', status: 'active', startDate: null, plannedDurationMonths: 24, progress: 0, client: null };
    ds.buildings = [{ id: 'b1', name: 'Block A', code: 'A', status: 'active', startDate: null }];
    ds.finalBoqItems = [{ id: 'f1', finalBoqId: 'fb1', businessCode: '10', description: 'Root', unit: 'no', quantity: 1, unitPrice: 1, totalValue: 1, itemStatus: 'active', parentItemId: null }];
    ds.components = [{ id: 'c1', finalBoqItemId: 'f1', businessCode: 'c1', description: 'component', unit: 'no', quantity: 1, unitPrice: 1, totalValue: 1 }];
    ds.contractorBoqs = [{ id: 'cb1', buildingId: 'b1', subcontractorId: null, workType: 'civil', status: 'active', createdAt: new Date() }];
    const item1: ContractorBoqItemRow = { id: 'i1', contractorBoqId: 'cb1', itemCode: 'A', description: 'works', unit: 'no', quantity: 10, assignedQuantity: 10, unitPrice: 100, totalValue: 1000, finalItemId: 'f1', componentId: null };
    const item2: ContractorBoqItemRow = { id: 'i2', contractorBoqId: 'cb1', itemCode: 'B', description: 'works', unit: 'no', quantity: 10, assignedQuantity: 10, unitPrice: 100, totalValue: 1000, finalItemId: 'f1', componentId: null };
    ds.contractorBoqItems = [item1, item2];
    ds.statementItems = [
      { statementId: 's1', contractorBoqItemId: 'i1', itemCode: 'A', totalExecuted: 5, executionPercent: 50, currentWorkValue: 500, unitPrice: 100 },
      { statementId: 's1', contractorBoqItemId: 'i2', itemCode: 'B', totalExecuted: 2.5, executionPercent: 25, currentWorkValue: 250, unitPrice: 100 },
    ];

    const prog = computeProgress(ds);

    expect(prog.projectPercent).toBe(37.5); // 750/2000
    expect(prog.buildings).toHaveLength(1);
    expect(prog.buildings[0].executedValue).toBe(750);
    expect(prog.buildings[0].totalValue).toBe(2000);
    expect(prog.categories[0].name).toBe('Root');
    expect(prog.boqs[0].percent).toBe(37.5);
  });
});

describe('boq breakdown', () => {
  it('computes profit as employer minus contractor value', () => {
    const ds = emptyDataset();
    ds.buildings = [{ id: 'b1', name: 'Block A', code: 'A', status: 'active', startDate: null }];
    ds.employerItems = [employerItem({ itemCode: 'A', totalValue: 1000 })];
    ds.contractorBoqs = [{ id: 'cb1', buildingId: 'b1', subcontractorId: null, workType: 'civil', status: 'active', createdAt: new Date() }];
    ds.contractorBoqItems = [{ id: 'i1', contractorBoqId: 'cb1', itemCode: 'A', description: 'works', unit: 'no', quantity: 10, assignedQuantity: 10, unitPrice: 60, totalValue: 600, finalItemId: null, componentId: null }];

    const res = computeBoqBreakdown(ds);

    expect(res.items).toHaveLength(1);
    expect(res.items[0].contractorValue).toBe(600);
    expect(res.items[0].profit).toBe(400);
    expect(res.items[0].margin).toBe(40);
    expect(res.items[0].classification).toBe('very_profitable');
    expect(res.totals.employerValue).toBe(1000);
    expect(res.totals.contractorValue).toBe(600);
    expect(res.totals.profit).toBe(400);
    expect(res.totals.margin).toBe(40);
  });

  it('classifies cost split by cost type', () => {
    const ds = emptyDataset();
    ds.buildings = [{ id: 'b1', name: 'Block A', code: 'A', status: 'active', startDate: null }];
    ds.employerItems = [
      employerItem({ itemCode: 'A', totalValue: 100 }),
      employerItem({ itemCode: 'B', totalValue: 100 }),
      employerItem({ itemCode: 'C', totalValue: 100 }),
    ];
    ds.contractorBoqs = [{ id: 'cb1', buildingId: 'b1', subcontractorId: null, workType: 'civil', status: 'active', createdAt: new Date() }];
    ds.contractorBoqItems = [
      { id: 'i1', contractorBoqId: 'cb1', itemCode: 'A', description: 'Carpenter works', unit: 'day', quantity: 1, assignedQuantity: 1, unitPrice: 10, totalValue: 10, finalItemId: null, componentId: null },
      { id: 'i2', contractorBoqId: 'cb1', itemCode: 'B', description: 'Crane', unit: 'rental', quantity: 1, assignedQuantity: 1, unitPrice: 10, totalValue: 10, finalItemId: null, componentId: null },
      { id: 'i3', contractorBoqId: 'cb1', itemCode: 'C', description: 'Cement', unit: 'ton', quantity: 1, assignedQuantity: 1, unitPrice: 10, totalValue: 10, finalItemId: null, componentId: null },
    ];

    const res = computeBoqBreakdown(ds);

    expect(res.items.find((i) => i.itemCode === 'A')?.laborCost).toBe(10);
    expect(res.items.find((i) => i.itemCode === 'B')?.equipmentCost).toBe(10);
    expect(res.items.find((i) => i.itemCode === 'C')?.materialCost).toBe(10);
  });
});

describe('boq intelligence', () => {
  it('sorts top profit/loss and counts classifications', () => {
    const ds = emptyDataset();
    ds.buildings = [{ id: 'b1', name: 'Block A', code: 'A', status: 'active', startDate: null }];
    ds.employerItems = [
      employerItem({ itemCode: 'A', totalValue: 1000 }),
      employerItem({ itemCode: 'B', totalValue: 100 }),
    ];
    ds.contractorBoqs = [{ id: 'cb1', buildingId: 'b1', subcontractorId: null, workType: 'civil', status: 'active', createdAt: new Date() }];
    ds.contractorBoqItems = [
      { id: 'i1', contractorBoqId: 'cb1', itemCode: 'A', description: 'works', unit: 'no', quantity: 1, assignedQuantity: 1, unitPrice: 60, totalValue: 60, finalItemId: null, componentId: null },
      { id: 'i2', contractorBoqId: 'cb1', itemCode: 'B', description: 'works', unit: 'no', quantity: 1, assignedQuantity: 1, unitPrice: 160, totalValue: 160, finalItemId: null, componentId: null },
    ];

    const intel = computeBoqIntelligence(ds);

    expect(intel.items).toHaveLength(2);
    expect(intel.topProfit[0].itemCode).toBe('A'); // 940 profit
    expect(intel.topLoss[0].itemCode).toBe('B'); // -60
    expect(intel.counts.very_profitable).toBe(1);
    expect(intel.counts.critical_loss).toBe(1);
  });
});

describe('plannedPercent', () => {
  it('uses project progress when no start date', () => {
    const ds = emptyDataset();
    ds.project = { id: 'p1', name: 'P1', code: 'C1', status: 'active', startDate: null, plannedDurationMonths: 24, progress: 30, client: null };
    expect(plannedPercent(ds)).toBe(30);
  });

  it('scales elapsed time against the configured planned duration', () => {
    const ds = emptyDataset();
    const start = new Date(Date.now() - 3 * 30 * 86400000); // exactly 3 months elapsed
    ds.project = { id: 'p1', name: 'P1', code: 'C1', status: 'active', startDate: start, plannedDurationMonths: 6, progress: 50, client: null };
    expect(plannedPercent(ds)).toBe(50);
  });

  it('falls back to the default 24-month horizon when duration is unset', () => {
    const ds = emptyDataset();
    const start = new Date(Date.now() - 3 * 30 * 86400000);
    ds.project = { id: 'p1', name: 'P1', code: 'C1', status: 'active', startDate: start, plannedDurationMonths: 0, progress: 50, client: null };
    expect(plannedPercent(ds)).toBe(12.5);
  });

  it('caps planned percent at 100', () => {
    const ds = emptyDataset();
    const start = new Date(Date.now() - 12 * 30 * 86400000);
    ds.project = { id: 'p1', name: 'P1', code: 'C1', status: 'active', startDate: start, plannedDurationMonths: 6, progress: 50, client: null };
    expect(plannedPercent(ds)).toBe(100);
  });
});
