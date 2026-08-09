import {
  AnalyticsDataset,
  ContractorBoqItemRow,
  RiskItem,
} from '../domain/analytics.types';
import { computeRisks } from './analytics-risks';
import {
  classifyCostType,
  computeBoqBreakdown,
  computeProgress,
  executedValueByItem,
  num,
  pctSafe,
  purchasesTotal,
  round2,
  safeDiv,
  sum,
  daysBetween,
} from './analytics-math';

export interface ContractorIntelligence {
  id: string;
  name: string;
  workType: string | null;
  assignedBOQ: number;
  completedBOQ: number;
  extractValue: number;
  paid: number;
  remaining: number;
  averageExecution: number;
  averageDelayDays: number;
  averageCost: number;
  profitContribution: number;
  ranking: number;
  reliabilityScore: number;
  qualityScore: number;
  performanceScore: number;
  buildingNames: string[];
}

export interface PurchaseIntelligence {
  purchaseBudget: number;
  actualPurchases: number;
  openOrders: { count: number; value: number };
  delivered: { count: number; value: number };
  delayed: { count: number; value: number };
  averageSupplierTimeDays: number;
  costOverrun: number;
  topSuppliers: { name: string; value: number; count: number }[];
  monthly: { month: string; value: number }[];
}

export interface TreasuryIntelligence {
  cashIn: number;
  cashOut: number;
  balance: number;
  committedPayments: number;
  upcomingPayments: number;
  netCashFlow: number;
  monthly: { month: string; cashIn: number; cashOut: number; net: number }[];
  daily: { date: string; cashIn: number; cashOut: number; net: number }[];
  forecast: { month: string; net: number; projectedBalance: number }[];
}

export interface InventoryIntelligence {
  consumption: number;
  received: number;
  currentStock: number;
  reservedStock: number;
  minimumStock: number;
  reorderItems: { id: string; code: string; name: string; quantity: number; minQuantity: number }[];
  materialCost: number;
  inventoryValue: number;
  turnover: number;
}

export interface EmployeeIntelligence {
  totalRecords: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
  latePercent: number;
  absencePercent: number;
  workedHours: number;
  overtimeHours: number;
  payrollCost: number;
  costPerProject: number;
  monthly: { month: string; attendance: number; late: number; overtimeHours: number }[];
}

export interface BuildingDashboard {
  id: string;
  name: string;
  progress: number;
  cost: number;
  revenue: number;
  profit: number;
  margin: number;
  boqValue: number;
  extracts: { count: number; value: number };
  contractors: { id: string; name: string; workType: string | null; value: number }[];
  materials: { count: number; value: number };
  delays: number;
  risks: RiskItem[];
}

export function computeContractorIntelligence(ds: AnalyticsDataset): ContractorIntelligence[] {
  const executedByItem = executedValueByItem(ds);
  const totalByBoq = new Map<string, number>();
  const executedByBoq = new Map<string, number>();
  for (const item of ds.contractorBoqItems) {
    totalByBoq.set(item.contractorBoqId, (totalByBoq.get(item.contractorBoqId) ?? 0) + num(item.totalValue));
    executedByBoq.set(item.contractorBoqId, (executedByBoq.get(item.contractorBoqId) ?? 0) + (executedByItem.get(item.id) ?? 0));
  }

  const byContractor = new Map<string, {
    boqs: string[];
    buildingNames: Set<string>;
    totalValue: number;
    executedValue: number;
    completedValue: number;
    extractValue: number;
    paid: number;
    statementDates: Date[];
    statementCount: number;
    finalStatementCount: number;
    executionPercentSum: number;
  }>();

  for (const boq of ds.contractorBoqs) {
    const subId = boq.subcontractorId ?? '';
    const entry = byContractor.get(subId) ?? {
      boqs: [],
      buildingNames: new Set<string>(),
      totalValue: 0,
      executedValue: 0,
      completedValue: 0,
      extractValue: 0,
      paid: 0,
      statementDates: [],
      statementCount: 0,
      finalStatementCount: 0,
      executionPercentSum: 0,
    };
    entry.boqs.push(boq.id);
    const building = ds.buildings.find((b) => b.id === boq.buildingId);
    if (building) entry.buildingNames.add(building.name);
    entry.totalValue += totalByBoq.get(boq.id) ?? 0;
    entry.executedValue += executedByBoq.get(boq.id) ?? 0;
    if (boq.status.toLowerCase() === 'completed') entry.completedValue += totalByBoq.get(boq.id) ?? 0;
    byContractor.set(subId, entry);
  }

  for (const st of ds.statements) {
    const boq = ds.contractorBoqs.find((b) => b.id === st.contractorBoqId);
    if (!boq) continue;
    const entry = byContractor.get(boq.subcontractorId ?? '');
    if (!entry) continue;
    entry.extractValue += num(st.netPayable);
    entry.statementCount += 1;
    if (st.status === 'final') entry.finalStatementCount += 1;
    entry.statementDates.push(st.extractDate);
  }

  for (const p of ds.payments) {
    if (!p.contractorId) continue;
    const entry = byContractor.get(p.contractorId);
    if (entry) entry.paid += num(p.amount);
  }

  for (const si of ds.statementItems) {
    const st = ds.statements.find((s) => s.id === si.statementId);
    if (!st) continue;
    const boq = ds.contractorBoqs.find((b) => b.id === st.contractorBoqId);
    if (!boq) continue;
    const entry = byContractor.get(boq.subcontractorId ?? '');
    if (entry) entry.executionPercentSum += num(si.executionPercent);
  }

  const rows: ContractorIntelligence[] = Array.from(byContractor.entries()).map(([subId, e]) => {
    const subcontractor = ds.subcontractors.find((s) => s.id === subId);
    const name = subcontractor?.name || (subId ? subId.slice(0, 8) : 'Unknown');
    const workType = subcontractor?.workType ?? null;
    const reliability = e.statementCount > 0 ? pctSafe(e.finalStatementCount, e.statementCount) : 100;
    const quality = e.statementCount > 0 ? round2(safeDiv(e.executionPercentSum, e.statementCount)) : 100;
    const averageExecution = pctSafe(e.executedValue, e.totalValue);
    const sortedDates = [...e.statementDates].sort((a, b) => a.getTime() - b.getTime());
    let avgGap = 0;
    if (sortedDates.length > 1) {
      const gaps: number[] = [];
      for (let i = 1; i < sortedDates.length; i++) gaps.push(daysBetween(sortedDates[i - 1], sortedDates[i]));
      avgGap = round2(sum(gaps) / gaps.length);
    }
    const averageDelay = Math.max(0, round2(avgGap - 30));
    const profitContribution = round2(e.totalValue - e.extractValue);
    const averageCost = e.boqs.length > 0 ? round2(safeDiv(e.paid, e.boqs.length)) : 0;
    const performance = round2(0.4 * averageExecution + 0.3 * reliability + 0.3 * quality);

    return {
      id: subId,
      name,
      workType,
      assignedBOQ: round2(e.totalValue),
      completedBOQ: round2(e.completedValue),
      extractValue: round2(e.extractValue),
      paid: round2(e.paid),
      remaining: round2(e.extractValue - e.paid),
      averageExecution: round2(averageExecution),
      averageDelayDays: averageDelay,
      averageCost,
      profitContribution,
      ranking: 0,
      reliabilityScore: round2(reliability),
      qualityScore: round2(quality),
      performanceScore: performance,
      buildingNames: Array.from(e.buildingNames),
    };
  });

  rows.sort((a, b) => b.profitContribution - a.profitContribution);
  rows.forEach((r, idx) => { r.ranking = idx + 1; });
  return rows;
}

export function computePurchaseIntelligence(ds: AnalyticsDataset): PurchaseIntelligence {
  const budgetItems = ds.contractorBoqItems.filter((i) => classifyCostType(i.description, i.unit) === 'material');
  const purchaseBudget = round2(sum(budgetItems.map((i) => i.totalValue)));

  const active = ds.purchases.filter((p) => p.status === 'pending' || p.status === 'approved');
  const delivered = ds.purchases.filter((p) => p.status === 'received');
  const delayed = ds.purchases.filter((p) => (p.status === 'pending' || p.status === 'approved') && daysBetween(p.date) > 14);

  const supplierMap = new Map<string, { value: number; count: number }>();
  for (const p of ds.purchases) {
    const key = p.supplierName?.trim() || 'Unknown';
    const entry = supplierMap.get(key) ?? { value: 0, count: 0 };
    entry.value += num(p.total);
    entry.count += 1;
    supplierMap.set(key, entry);
  }

  const monthlyMap = new Map<string, number>();
  for (const p of ds.purchases) {
    const key = p.date.toISOString().slice(0, 7);
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + num(p.total));
  }

  const deliveredDays = delivered.map((p) => daysBetween(p.date));
  const averageSupplierTime = deliveredDays.length > 0 ? round2(sum(deliveredDays) / deliveredDays.length) : 0;

  return {
    purchaseBudget,
    actualPurchases: purchasesTotal(ds),
    openOrders: { count: active.length, value: round2(sum(active.map((p) => p.total))) },
    delivered: { count: delivered.length, value: round2(sum(delivered.map((p) => p.total))) },
    delayed: { count: delayed.length, value: round2(sum(delayed.map((p) => p.total))) },
    averageSupplierTimeDays: averageSupplierTime,
    costOverrun: round2(purchasesTotal(ds) - purchaseBudget),
    topSuppliers: Array.from(supplierMap.entries())
      .map(([name, v]) => ({ name, value: round2(v.value), count: v.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    monthly: Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value: round2(value) })),
  };
}

export function computeTreasuryIntelligence(ds: AnalyticsDataset): TreasuryIntelligence {
  const approved = ds.fundTransactions.filter((t) => t.status === 'approved');
  const cashIn = round2(sum(approved.filter((t) => t.type === 'add').map((t) => t.amount)));
  const cashOut = round2(sum(approved.filter((t) => t.type === 'deduct').map((t) => t.amount)));

  const paidByStatement = new Map<string, number>();
  for (const p of ds.payments) {
    const statementId = p.statementId;
    if (!statementId) continue;
    paidByStatement.set(statementId, (paidByStatement.get(statementId) ?? 0) + num(p.amount));
  }
  const committed = round2(
    sum(ds.statements.map((s) => Math.max(0, num(s.netPayable) - (paidByStatement.get(s.id) ?? 0)))),
  );
  const upcoming = round2(
    sum(
      ds.statements
        .filter((s) => s.status === 'running')
        .map((s) => Math.max(0, num(s.netPayable) - (paidByStatement.get(s.id) ?? 0))),
    ),
  );

  const balance = ds.fund ? num(ds.fund.currentBalance) : round2(cashIn - cashOut);
  const net = round2(cashIn - cashOut);

  const monthlyMap = new Map<string, { cashIn: number; cashOut: number }>();
  const dailyMap = new Map<string, { cashIn: number; cashOut: number }>();
  for (const t of approved) {
    const m = t.date.toISOString().slice(0, 7);
    const d = t.date.toISOString().slice(0, 10);
    const me = monthlyMap.get(m) ?? { cashIn: 0, cashOut: 0 };
    const de = dailyMap.get(d) ?? { cashIn: 0, cashOut: 0 };
    if (t.type === 'add') { me.cashIn += num(t.amount); de.cashIn += num(t.amount); }
    else if (t.type === 'deduct') { me.cashOut += num(t.amount); de.cashOut += num(t.amount); }
    monthlyMap.set(m, me);
    dailyMap.set(d, de);
  }

  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, cashIn: round2(v.cashIn), cashOut: round2(v.cashOut), net: round2(v.cashIn - v.cashOut) }));
  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, v]) => ({ date, cashIn: round2(v.cashIn), cashOut: round2(v.cashOut), net: round2(v.cashIn - v.cashOut) }));

  const avgMonthlyNet = monthly.length > 0 ? net / monthly.length : 0;
  const forecast = [1, 2, 3].map((i) => {
    const next = new Date();
    next.setMonth(next.getMonth() + i);
    const month = next.toISOString().slice(0, 7);
    const projectedBalance = round2(balance + avgMonthlyNet * i);
    return { month, net: round2(avgMonthlyNet), projectedBalance };
  });

  return { cashIn, cashOut, balance, committedPayments: committed, upcomingPayments: upcoming, netCashFlow: net, monthly, daily, forecast };
}

export function computeInventoryIntelligence(ds: AnalyticsDataset): InventoryIntelligence {
  const issued = ds.stockMovements.filter((m) => m.type === 'ISSUE');
  const received = ds.stockMovements.filter((m) => m.type === 'RECEIVE');
  const consumption = round2(sum(issued.map((m) => m.quantity)));
  const reserved = round2(sum(ds.purchases.filter((p) => p.status === 'approved').map((p) => p.quantity)));
  const currentStock = round2(sum(ds.inventoryItems.map((i) => i.quantity)));
  const minimumStock = round2(sum(ds.inventoryItems.map((i) => i.minQuantity)));
  const reorderItems = ds.inventoryItems
    .filter((i) => num(i.quantity) <= num(i.minQuantity))
    .map((i) => ({ id: i.id, code: i.code, name: i.name, quantity: round2(i.quantity), minQuantity: round2(i.minQuantity) }));
  const inventoryValue = round2(sum(ds.inventoryItems.map((i) => num(i.quantity) * num(i.price))));

  const consumedValue = round2(
    sum(issued.map((m) => {
      const item = ds.inventoryItems.find((i) => i.id === m.itemId);
      return num(m.quantity) * (item ? num(item.price) : 0);
    })),
  );
  const turnover = inventoryValue > 0 ? round2(safeDiv(consumedValue, inventoryValue)) : 0;

  return {
    consumption,
    received: round2(sum(received.map((m) => m.quantity))),
    currentStock,
    reservedStock: reserved,
    minimumStock,
    reorderItems,
    materialCost: consumedValue,
    inventoryValue,
    turnover,
  };
}

export function computeEmployeeIntelligence(ds: AnalyticsDataset): EmployeeIntelligence {
  const total = ds.attendance.length;
  const isPresent = (a: { attendanceStatus: string; status: string }) =>
    ['present', 'checkedin', 'checkedout', 'late', 'pending'].includes(a.attendanceStatus.toLowerCase());
  const isLate = (a: { attendanceStatus: string; status: string }) => a.attendanceStatus.toLowerCase() === 'late' || a.status.toLowerCase() === 'late';
  const isAbsent = (a: { attendanceStatus: string; status: string }) => a.attendanceStatus.toLowerCase() === 'absent' || a.status.toLowerCase() === 'absent';

  const present = ds.attendance.filter(isPresent).length;
  const late = ds.attendance.filter(isLate).length;
  const absent = ds.attendance.filter(isAbsent).length;

  const workedHours = round2(sum(ds.attendance.map((a) => num(a.workedMinutes ?? 0) / 60 + num(a.hoursWorked))));
  const overtimeHours = round2(sum(ds.attendance.map((a) => Math.max(0, (num(a.workedMinutes ?? 0) - 480) / 60))));

  const activeEmployees = ds.employees.filter((e) => e.status === 'active');
  const payrollCost = round2(sum(activeEmployees.map((e) => num(e.salary))));

  const employeeAttendanceDays = new Map<string, number>();
  const projectAttendanceDays = ds.attendance.length;
  for (const a of ds.attendance) {
    if (!a.employeeId) continue;
    employeeAttendanceDays.set(a.employeeId, (employeeAttendanceDays.get(a.employeeId) ?? 0) + 1);
  }
  let costPerProject = 0;
  for (const e of activeEmployees) {
    const days = employeeAttendanceDays.get(e.id) ?? 0;
    if (days > 0) costPerProject += num(e.salary) * (days / Math.max(1, projectAttendanceDays));
  }

  const monthlyMap = new Map<string, { attendance: number; late: number; overtime: number }>();
  for (const a of ds.attendance) {
    const key = a.date.toISOString().slice(0, 7);
    const entry = monthlyMap.get(key) ?? { attendance: 0, late: 0, overtime: 0 };
    entry.attendance += 1;
    if (isLate(a)) entry.late += 1;
    entry.overtime += Math.max(0, (num(a.workedMinutes ?? 0) - 480) / 60);
    monthlyMap.set(key, entry);
  }

  return {
    totalRecords: total,
    present,
    late,
    absent,
    attendanceRate: total > 0 ? round2((present / total) * 100) : 100,
    latePercent: total > 0 ? round2((late / total) * 100) : 0,
    absencePercent: total > 0 ? round2((absent / total) * 100) : 0,
    workedHours,
    overtimeHours,
    payrollCost,
    costPerProject: round2(costPerProject),
    monthly: Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, attendance: v.attendance, late: v.late, overtimeHours: round2(v.overtime) })),
  };
}

export function computeBuildingDashboards(ds: AnalyticsDataset): BuildingDashboard[] {
  const progress = computeProgress(ds);
  const boq = computeBoqBreakdown(ds);
  const contractors = computeContractorIntelligence(ds);
  const allRisks = computeRisks(ds).items;

  return ds.buildings.map((b) => {
    const p = progress.buildings.find((x) => x.id === b.id);
    const bItems = boq.items.filter((i) => i.buildingId === b.id);
    const bBoqs = ds.contractorBoqs.filter((cb) => cb.buildingId === b.id);
    const extracts = ds.statements.filter((s) => bBoqs.some((cb) => cb.id === s.contractorBoqId));
    const bContractors = contractors.filter((c) => c.buildingNames.includes(b.name));
    const materials = ds.purchases.filter((p) => p.buildingId === b.id);
    const revenue = round2(sum(bItems.map((i) => i.revenue)));
    const cost = round2(sum(bItems.map((i) => i.contractorValue ?? 0)));
    const profit = round2(revenue - cost);
    const delays = bBoqs.filter(
      (cb) => !['completed', 'cancelled'].includes(cb.status.toLowerCase()) && daysBetween(cb.createdAt) > 60,
    ).length;
    const bBoqIds = new Set(bBoqs.map((cb) => cb.id));
    const risks = allRisks.filter(
      (r) => (r.relatedEntityId && bBoqIds.has(r.relatedEntityId)) || (bContractors.some((c) => c.id === r.relatedEntityId)),
    );

    return {
      id: b.id,
      name: b.name,
      progress: p?.percent ?? 0,
      cost,
      revenue,
      profit,
      margin: pctSafe(revenue - cost, revenue),
      boqValue: round2(sum(bItems.map((i) => i.contractorValue ?? 0))),
      extracts: { count: extracts.length, value: round2(sum(extracts.map((s) => s.netPayable))) },
      contractors: bContractors.map((c) => ({ id: c.id, name: c.name, workType: c.workType, value: c.assignedBOQ })),
      materials: { count: materials.length, value: round2(sum(materials.map((m) => m.total))) },
      delays,
      risks,
    };
  });
}
