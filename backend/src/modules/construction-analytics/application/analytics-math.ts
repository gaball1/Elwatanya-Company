import {
  AnalyticsDataset,
  ContractorBoqItemRow,
  DrillDownNode,
} from '../domain/analytics.types';

export const num = (v: any): number => (typeof v === 'number' ? v : Number(v ?? 0));
export const round2 = (v: number): number => Math.round(v * 100) / 100;
export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
export const sum = (values: number[]): number => values.reduce((a, b) => a + num(b), 0);
export const safeDiv = (a: number, b: number, fallback = 0): number => (b > 0 ? a / b : fallback);
export const pct = (ratio: number): number => round2(ratio * 100);
export const pctSafe = (a: number, b: number): number => (b > 0 ? round2((a / b) * 100) : 0);
export const daysBetween = (from: Date, to: Date = new Date()): number =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));

const MONTH_MS = 30 * 86400000;
const DEFAULT_PLANNED_MONTHS = 24;

export interface EarnedValueResult {
  pv: number;
  ev: number;
  ac: number;
  bac: number;
  cpi: number;
  spi: number;
  sv: number;
  cv: number;
  etc: number;
  eac: number;
  vac: number;
  plannedPercent: number;
  actualPercent: number;
}

export interface ProgressResult {
  projectPercent: number;
  buildings: { id: string; name: string; percent: number; executedValue: number; totalValue: number }[];
  categories: { id: string; name: string; percent: number; executedValue: number; totalValue: number }[];
  boqs: { id: string; buildingId: string; name: string; percent: number; executedValue: number; totalValue: number }[];
}

/**
 * Planned percent complete derived from schedule time elapsed over the
 * project's configured planned duration (defaults to a 24-month horizon
 * when the project has no planned duration).
 */
export function plannedPercent(ds: AnalyticsDataset): number {
  if (ds.project?.startDate) {
    const elapsedMonths = Math.max(0, (Date.now() - ds.project.startDate.getTime()) / MONTH_MS);
    const plannedMonths = ds.project.plannedDurationMonths || DEFAULT_PLANNED_MONTHS;
    if (plannedMonths > 0) {
      return clamp(pctSafe(elapsedMonths, plannedMonths), 0, 100);
    }
  }
  return clamp(num(ds.project?.progress ?? 0), 0, 100);
}

export function employerBoqTotal(ds: AnalyticsDataset): number {
  return round2(sum(ds.employerItems.map((i) => i.totalValue)));
}

export function analyticalBoqTotal(ds: AnalyticsDataset): number {
  return round2(sum(ds.analyticalItems.map((i) => i.totalValue)));
}

export function contractorBoqTotal(ds: AnalyticsDataset): number {
  return round2(sum(ds.contractorBoqItems.map((i) => i.totalValue)));
}

/** Approved extracts value (EV): sum of statement work value. */
export function extractWorkValue(ds: AnalyticsDataset): number {
  return round2(sum(ds.statements.map((s) => s.totalWorkValue)));
}

export function paymentsTotal(ds: AnalyticsDataset): number {
  return round2(sum(ds.payments.map((p) => p.amount)));
}

export function purchasesTotal(ds: AnalyticsDataset): number {
  return round2(sum(ds.purchases.filter((p) => p.status !== 'cancelled').map((p) => p.total)));
}

export function purchasesReceivedTotal(ds: AnalyticsDataset): number {
  return round2(sum(ds.purchases.filter((p) => p.status === 'received').map((p) => p.total)));
}

export function miscTotal(ds: AnalyticsDataset): number {
  return round2(sum(ds.miscellaneous.map((m) => m.amount)));
}

export function actualCostTotal(ds: AnalyticsDataset): number {
  return round2(paymentsTotal(ds) + purchasesReceivedTotal(ds) + miscTotal(ds));
}

/** Value of executed work per contractor BOQ item, from extract statement items. */
export function executedValueByItem(ds: AnalyticsDataset): Map<string, number> {
  const map = new Map<string, number>();
  for (const si of ds.statementItems) {
    map.set(si.contractorBoqItemId, (map.get(si.contractorBoqItemId) ?? 0) + num(si.currentWorkValue));
  }
  return map;
}

/** Root category id for a contractor BOQ item via the Final BOQ hierarchy. */
export function itemCategory(ds: AnalyticsDataset, item: ContractorBoqItemRow): string | null {
  let finalId = item.finalItemId;
  if (!finalId && item.componentId) {
    const component = ds.components.find((c) => c.id === item.componentId);
    finalId = component?.finalBoqItemId ?? null;
  }
  if (!finalId) return null;
  let node = ds.finalBoqItems.find((f) => f.id === finalId);
  if (!node) return null;
  let guard = 0;
  while (node.parentItemId && guard < 20) {
    const parent = ds.finalBoqItems.find((f) => f.id === node!.parentItemId);
    if (!parent) break;
    node = parent;
    guard++;
  }
  return node.id;
}

export function computeEarnedValue(ds: AnalyticsDataset): EarnedValueResult {
  const bac = employerBoqTotal(ds);
  const ev = extractWorkValue(ds);
  const ac = actualCostTotal(ds);
  const planned = plannedPercent(ds);
  const pv = round2(bac * (planned / 100));

  const cpi = round2(safeDiv(ev, ac, 1));
  const spi = round2(safeDiv(ev, pv, ev > 0 ? 1 : 0));
  const sv = round2(ev - pv);
  const cv = round2(ev - ac);
  const etc = round2(cpi > 0 ? (bac - ev) / cpi : Math.max(0, bac - ev));
  const eac = round2(ac + etc);
  const vac = round2(bac - eac);

  return { pv, ev, ac, bac, cpi, spi, sv, cv, etc, eac, vac, plannedPercent: planned, actualPercent: pctSafe(ev, bac) };
}

export function computeProgress(ds: AnalyticsDataset): ProgressResult {
  const executedByItem = executedValueByItem(ds);
  const totalByBoq = new Map<string, number>();
  const executedByBoq = new Map<string, number>();

  for (const item of ds.contractorBoqItems) {
    totalByBoq.set(item.contractorBoqId, (totalByBoq.get(item.contractorBoqId) ?? 0) + num(item.totalValue));
    executedByBoq.set(item.contractorBoqId, (executedByBoq.get(item.contractorBoqId) ?? 0) + (executedByItem.get(item.id) ?? 0));
  }

  const boqs = ds.contractorBoqs.map((b) => {
    const total = totalByBoq.get(b.id) ?? 0;
    const executed = executedByBoq.get(b.id) ?? 0;
    const building = ds.buildings.find((x) => x.id === b.buildingId);
    return {
      id: b.id,
      buildingId: b.buildingId,
      name: building ? `${building.name} / ${b.workType || 'BOQ'}` : b.workType || 'BOQ',
      percent: pctSafe(executed, total),
      executedValue: round2(executed),
      totalValue: round2(total),
    };
  });

  const buildings = ds.buildings.map((b) => {
    const bBoqs = boqs.filter((x) => x.buildingId === b.id);
    const total = sum(bBoqs.map((x) => x.totalValue));
    const executed = sum(bBoqs.map((x) => x.executedValue));
    return { id: b.id, name: b.name, percent: pctSafe(executed, total), executedValue: round2(executed), totalValue: round2(total) };
  });

  const categoriesMap = new Map<string, { name: string; executed: number; total: number }>();
  for (const item of ds.contractorBoqItems) {
    const catId = itemCategory(ds, item);
    const key = catId ?? '__uncategorized__';
    const entry = categoriesMap.get(key) ?? { name: key === '__uncategorized__' ? 'Uncategorized' : (ds.finalBoqItems.find((f) => f.id === key)?.description || key), executed: 0, total: 0 };
    entry.total += num(item.totalValue);
    entry.executed += executedByItem.get(item.id) ?? 0;
    categoriesMap.set(key, entry);
  }
  const categories = Array.from(categoriesMap.entries()).map(([id, c]) => ({
    id,
    name: c.name,
    percent: pctSafe(c.executed, c.total),
    executedValue: round2(c.executed),
    totalValue: round2(c.total),
  }));

  const projectTotal = sum(boqs.map((b) => b.totalValue));
  const projectExecuted = sum(boqs.map((b) => b.executedValue));

  return { projectPercent: pctSafe(projectExecuted, projectTotal), buildings, categories, boqs };
}

/** Material / labor / equipment classification (automatic, keyword + unit based). */
export type CostType = 'material' | 'labor' | 'equipment';

const LABOR_UNITS = ['hour', 'hr', 'hrs', 'day', 'man-day', 'manhour', 'ساعة', 'يوم', 'عامل'];
const EQUIPMENT_UNITS = ['rental', 'day-rental', 'معدة', 'معدات', 'ساعة معدات'];
const LABOR_KEYWORDS = ['labor', 'carpenter', 'mason', 'painter', 'rebar', 'steel fixer', 'عامل', 'نجار', 'حداد', 'دهان', 'بناء', 'عمل'];
const EQUIPMENT_KEYWORDS = ['crane', 'loader', 'excavator', 'mixer', 'generator', 'vibrator', 'ونش', 'لودر', 'حفار', 'خلاطة', 'مولد', 'معدة', 'معدات'];

export function classifyCostType(text: string, unit: string = ''): CostType {
  const haystack = `${text} ${unit}`.toLowerCase();
  if (LABOR_UNITS.some((u) => unit.trim().toLowerCase() === u.toLowerCase()) || LABOR_KEYWORDS.some((k) => haystack.includes(k))) return 'labor';
  if (EQUIPMENT_UNITS.some((u) => unit.trim().toLowerCase() === u.toLowerCase()) || EQUIPMENT_KEYWORDS.some((k) => haystack.includes(k))) return 'equipment';
  return 'material';
}

export interface BoqItemAnalysis {
  buildingId: string;
  buildingName: string;
  itemCode: string;
  description: string;
  unit: string;
  employerRate: number;
  employerValue: number;
  analyticalValue: number | null;
  contractorValue: number | null;
  actualCost: number;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  purchaseCost: number;
  treasuryExpense: number;
  miscExpense: number;
  profit: number;
  loss: number;
  margin: number;
  variance: number;
  classification: 'very_profitable' | 'profitable' | 'break_even' | 'loss' | 'critical_loss';
  progress: number;
  revenue: number;
}

export function classifyItem(margin: number): BoqItemAnalysis['classification'] {
  if (margin >= 25) return 'very_profitable';
  if (margin >= 10) return 'profitable';
  if (margin >= -5) return 'break_even';
  if (margin >= -25) return 'loss';
  return 'critical_loss';
}

export interface BoqBreakdownResult {
  items: BoqItemAnalysis[];
  totals: {
    employerValue: number;
    contractorValue: number;
    analyticalValue: number;
    actualCost: number;
    profit: number;
    margin: number;
  };
}

export function computeBoqBreakdown(ds: AnalyticsDataset): BoqBreakdownResult {
  const executedByItem = executedValueByItem(ds);

  const items: BoqItemAnalysis[] = ds.employerItems.map((e) => {
    const building = ds.buildings.find((b) => b.id === e.buildingId);
    const analytical = ds.analyticalItems.find((a) => a.buildingId === e.buildingId && a.itemCode === e.itemCode);
    const contractorBoq = ds.contractorBoqs.find((b) => b.buildingId === e.buildingId);
    const contractorItem = ds.contractorBoqItems.find(
      (i) => i.contractorBoqId === contractorBoq?.id && i.itemCode === e.itemCode,
    );
    const contractorValue = contractorItem ? num(contractorItem.totalValue) : null;
    const actualCost = contractorItem ? (executedByItem.get(contractorItem.id) ?? 0) : 0;

    let materialCost = 0;
    let laborCost = 0;
    let equipmentCost = 0;
    if (contractorItem) {
      const costType = classifyCostType(contractorItem.description, contractorItem.unit);
      const splitBase = contractorValue ?? actualCost;
      if (costType === 'labor') laborCost = splitBase;
      else if (costType === 'equipment') equipmentCost = splitBase;
      else materialCost = splitBase;
    }
    const purchaseCost = 0;
    const treasuryExpense = 0;
    const miscExpense = 0;
    const revenue = num(e.totalValue);
    const cost = contractorValue ?? actualCost;
    const profit = round2(revenue - cost);
    const loss = profit < 0 ? Math.abs(profit) : 0;
    const margin = pctSafe(revenue - cost, revenue);
    const variance = round2(revenue - actualCost);

    return {
      buildingId: e.buildingId,
      buildingName: building?.name ?? '',
      itemCode: e.itemCode,
      description: e.description,
      unit: e.unit,
      employerRate: num(e.unitPrice),
      employerValue: revenue,
      analyticalValue: analytical ? num(analytical.totalValue) : null,
      contractorValue,
      actualCost: round2(actualCost),
      materialCost: round2(materialCost),
      laborCost: round2(laborCost),
      equipmentCost: round2(equipmentCost),
      purchaseCost: round2(purchaseCost),
      treasuryExpense: round2(treasuryExpense),
      miscExpense: round2(miscExpense),
      profit,
      loss,
      margin: round2(margin),
      variance: round2(variance),
      classification: classifyItem(margin),
      progress: contractorItem ? pctSafe(actualCost, contractorValue ?? 0) : 0,
      revenue,
    };
  });

  const totals = {
    employerValue: round2(sum(items.map((i) => i.employerValue))),
    contractorValue: round2(sum(items.map((i) => i.contractorValue ?? 0))),
    analyticalValue: round2(sum(items.map((i) => i.analyticalValue ?? 0))),
    actualCost: round2(sum(items.map((i) => i.actualCost))),
    profit: round2(sum(items.map((i) => i.profit))),
    margin: pctSafe(sum(items.map((i) => i.employerValue)) - sum(items.map((i) => i.contractorValue ?? 0)), sum(items.map((i) => i.employerValue))),
  };

  return { items, totals };
}

export interface BoqIntelligenceResult {
  items: BoqItemAnalysis[];
  topProfit: BoqItemAnalysis[];
  topLoss: BoqItemAnalysis[];
  topDelayed: BoqItemAnalysis[];
  highestCost: BoqItemAnalysis[];
  highestRevenue: BoqItemAnalysis[];
  counts: Record<string, number>;
}

export function computeBoqIntelligence(ds: AnalyticsDataset): BoqIntelligenceResult {
  const { items } = computeBoqBreakdown(ds);
  const sorted = (fn: (a: BoqItemAnalysis, b: BoqItemAnalysis) => number, n = 10) => [...items].sort(fn).slice(0, n);
  const counts: Record<string, number> = {};
  for (const i of items) counts[i.classification] = (counts[i.classification] ?? 0) + 1;
  return {
    items,
    topProfit: sorted((a, b) => b.profit - a.profit),
    topLoss: sorted((a, b) => a.profit - b.profit).filter((i) => i.profit < 0),
    topDelayed: sorted((a, b) => a.progress - b.progress).filter((i) => i.progress < 100),
    highestCost: sorted((a, b) => (b.contractorValue ?? 0) - (a.contractorValue ?? 0)),
    highestRevenue: sorted((a, b) => b.revenue - a.revenue),
    counts,
  };
}

export interface DrillDownInput {
  ds: AnalyticsDataset;
  kpi: 'progress' | 'cost' | 'revenue' | 'profit';
}

export function computeDrillDown({ ds, kpi }: DrillDownInput): DrillDownNode | null {
  if (!ds.project) return null;
  const boq = computeBoqBreakdown(ds);

  const projectValue =
    kpi === 'progress' ? computeProgress(ds).projectPercent
    : kpi === 'cost' ? round2(boq.totals.contractorValue)
    : kpi === 'revenue' ? round2(boq.totals.employerValue)
    : round2(boq.totals.profit);

  const fmt = (v: number) => (kpi === 'progress' ? `${v.toFixed(1)}%` : `${v.toLocaleString()} EGP`);

  const buildingNodes = ds.buildings.map((b) => {
    const bItems = boq.items.filter((i) => i.buildingId === b.id);
    const bValue =
      kpi === 'progress' ? computeProgress(ds).buildings.find((x) => x.id === b.id)?.percent ?? 0
      : kpi === 'cost' ? round2(sum(bItems.map((i) => i.contractorValue ?? 0)))
      : kpi === 'revenue' ? round2(sum(bItems.map((i) => i.revenue)))
      : round2(sum(bItems.map((i) => i.profit)));

    const boqNodes = ds.contractorBoqs.filter((cb) => cb.buildingId === b.id).map((cb) => {
      const cbItems = ds.contractorBoqItems.filter((i) => i.contractorBoqId === cb.id);
      const cbValue =
        kpi === 'progress' ? computeProgress(ds).boqs.find((x) => x.id === cb.id)?.percent ?? 0
        : kpi === 'cost' ? round2(sum(cbItems.map((i) => i.totalValue)))
        : kpi === 'revenue' ? round2(sum(cbItems.map((i) => i.totalValue)))
        : 0;

      const extractNodes = ds.statements.filter((s) => s.contractorBoqId === cb.id).map((s) => ({
        level: 'extract',
        id: s.id,
        name: `Extract ${s.runningNumber ?? s.sequenceNumber} (${s.status})`,
        value: round2(s.netPayable),
        display: `${s.netPayable.toLocaleString()} EGP`,
        children: ds.payments
          .filter((p) => p.statementId === s.id)
          .map((p) => ({
            level: 'payment',
            id: p.id,
            name: `Payment ${p.paidAt.toISOString().slice(0, 10)}`,
            value: round2(p.amount),
            display: `${p.amount.toLocaleString()} EGP`,
            children: [],
          })),
      }));

      return {
        level: 'boq',
        id: cb.id,
        name: cb.workType || 'BOQ',
        value: cbValue,
        display: fmt(cbValue),
        children: extractNodes,
      };
    });

    return {
      level: 'building',
      id: b.id,
      name: b.name,
      value: bValue,
      display: fmt(bValue),
      children: boqNodes,
    };
  });

  return {
    level: 'project',
    id: ds.project.id,
    name: ds.project.name,
    value: round2(projectValue),
    display: fmt(projectValue),
    children: buildingNodes,
  };
}
