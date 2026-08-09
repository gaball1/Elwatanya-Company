import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:3001/api/v1';

// ---------------------------------------------------------------------------
// Independent re-implementation of the documented analytics formulas using
// raw SQL aggregates (NOT the production code paths). Used to detect bugs in
// the analytics engine by cross-checking the live API against these values.
// ---------------------------------------------------------------------------
const num = (v: any): number => (typeof v === 'number' ? v : Number(v ?? 0));
const round2 = (v: number) => Math.round(v * 100) / 100;
const safeDiv = (a: number, b: number, fallback = 0) => (b > 0 ? a / b : fallback);
const pctSafe = (a: number, b: number) => (b > 0 ? round2((a / b) * 100) : 0);

// cost-type keyword lists (documented in analytics-math.ts)
const LABOR_UNITS = ['hour', 'hr', 'hrs', 'day', 'man-day', 'manhour', 'ساعة', 'يوم', 'عامل'];
const EQUIPMENT_UNITS = ['rental', 'day-rental', 'معدة', 'معدات', 'ساعة معدات'];
const LABOR_KEYWORDS = ['labor', 'carpenter', 'mason', 'painter', 'rebar', 'steel fixer', 'عامل', 'نجار', 'حداد', 'دهان', 'بناء', 'عمل'];
const EQUIPMENT_KEYWORDS = ['crane', 'loader', 'excavator', 'mixer', 'generator', 'vibrator', 'ونش', 'لودر', 'حفار', 'خلاطة', 'مولد', 'معدة', 'معدات'];
function classifyCostType(text: string, unit = ''): 'material' | 'labor' | 'equipment' {
  const haystack = `${text} ${unit}`.toLowerCase();
  if (LABOR_UNITS.some((u) => unit.trim().toLowerCase() === u.toLowerCase()) || LABOR_KEYWORDS.some((k) => haystack.includes(k))) return 'labor';
  if (EQUIPMENT_UNITS.some((u) => unit.trim().toLowerCase() === u.toLowerCase()) || EQUIPMENT_KEYWORDS.some((k) => haystack.includes(k))) return 'equipment';
  return 'material';
}

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(label: string, actual: any, expected: any, tol = 0.02) {
  const a = typeof actual === 'number' ? num(actual) : actual;
  const e = typeof expected === 'number' ? num(expected) : expected;
  const ok = typeof a === 'number' && typeof e === 'number' ? Math.abs(a - e) <= tol : String(a) === String(e);
  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push(`${label}: got ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`);
    console.log(`  FAIL ${label}: got ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`);
  }
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }),
  });
  const json = await res.json();
  return json.accessToken || json.data?.accessToken;
}

async function getApi(token: string, path: string) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json.success) throw new Error(`${path}: ${json.message}`);
  return json.data;
}

async function verifyProject(token: string, projectId: string) {
  console.log(`\n=== Project ${projectId} ===`);
  const [dash, evm, prog, cost, treas, purch, inv, emp, risks] = await Promise.all([
    getApi(token, `/analytics/project/${projectId}/dashboard`),
    getApi(token, `/analytics/project/${projectId}/evm`),
    getApi(token, `/analytics/project/${projectId}/progress`),
    getApi(token, `/analytics/project/${projectId}/costs`),
    getApi(token, `/analytics/project/${projectId}/treasury`),
    getApi(token, `/analytics/project/${projectId}/purchases`),
    getApi(token, `/analytics/project/${projectId}/inventory`),
    getApi(token, `/analytics/project/${projectId}/employees`),
    getApi(token, `/analytics/project/${projectId}/risks`),
  ]);

  // ---- Raw data ----
  const buildings = await prisma.building.findMany({ where: { projectId, deletedAt: null } });
  const bids = buildings.map((b) => b.id);
  const contractorBoqs = await prisma.contractorBoq.findMany({ where: { buildingId: { in: bids } } });
  const cboqIds = contractorBoqs.map((c) => c.id);

  const [bac, ev, payAgg, purchRecv, miscAgg, stmtCount, pendingApprovals] = await Promise.all([
    prisma.employerBoqItem.aggregate({ where: { buildingId: { in: bids } }, _sum: { totalValue: true } }),
    prisma.statement.aggregate({ where: { contractorBoqId: { in: cboqIds } }, _sum: { totalWorkValue: true } }),
    prisma.payment.aggregate({ where: { buildingId: { in: bids } }, _sum: { amount: true } }),
    prisma.purchase.aggregate({ where: { projectId, status: 'received' }, _sum: { total: true } }),
    prisma.miscellaneous.aggregate({ where: { projectId }, _sum: { amount: true } }),
    prisma.statement.count({ where: { contractorBoqId: { in: cboqIds } } }),
    prisma.approval.count({ where: { status: 'pending' } }),
  ]);

  const BAC = num(bac._sum?.totalValue);
  const EV = num(ev._sum?.totalWorkValue);
  const payments = num(payAgg._sum?.amount);
  const purRecv = num(purchRecv._sum?.total);
  const misc = num(miscAgg._sum?.amount);
  const AC = round2(payments + purRecv + misc);

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  const elapsedMonths = project?.startDate ? Math.max(0, (Date.now() - project.startDate.getTime()) / (30 * 86400000)) : 0;
  const planned = project?.startDate
    ? Math.min(100, Math.max(0, pctSafe(elapsedMonths, 24)))
    : Math.min(100, Math.max(0, num(project?.progress ?? 0)));
  const PV = round2(BAC * (planned / 100));

  // EVM cross-check
  check('BAC', dash.evm.bac, BAC);
  check('EV', dash.evm.ev, EV);
  check('AC', dash.evm.ac, AC);
  check('PV', dash.evm.pv, PV);
  check('plannedPercent', dash.evm.plannedPercent, planned);
  const cpi = round2(safeDiv(EV, AC, 1));
  const spi = round2(safeDiv(EV, PV, EV > 0 ? 1 : 0));
  check('CPI', dash.evm.cpi, cpi);
  check('SPI', dash.evm.spi, spi);
  check('SV', dash.evm.sv, round2(EV - PV));
  check('CV', dash.evm.cv, round2(EV - AC));
  const etc = round2(cpi > 0 ? (BAC - EV) / cpi : Math.max(0, BAC - EV));
  check('ETC', dash.evm.etc, etc);
  check('EAC', dash.evm.eac, round2(AC + etc));
  check('VAC', dash.evm.vac, round2(BAC - round2(AC + etc)));
  check('actualPercent', dash.evm.actualPercent, pctSafe(EV, BAC));
  check('kpis.ev', dash.kpis.ev.value, EV);
  check('kpis.ac', dash.kpis.ac.value, AC);
  check('kpis.bac-ish(boq_profit uses cost)', dash.kpis.boq_profit.value, num(dash.cost.profit));

  // Progress cross-check
  const execByItemRaw = await prisma.statementItem.groupBy({
    by: ['contractorBoqItemId'],
    where: { contractorBoqItem: { contractorBoqId: { in: cboqIds } } },
    _sum: { currentWorkValue: true },
  });
  const execByItem = new Map(execByItemRaw.map((r) => [r.contractorBoqItemId, num(r._sum?.currentWorkValue)]));
  const cbItems = await prisma.contractorBoqItem.findMany({ where: { contractorBoqId: { in: cboqIds } } });
  const totalByBoq = new Map<string, number>();
  const execByBoq = new Map<string, number>();
  for (const it of cbItems) {
    totalByBoq.set(it.contractorBoqId, (totalByBoq.get(it.contractorBoqId) ?? 0) + num(it.totalValue));
    execByBoq.set(it.contractorBoqId, (execByBoq.get(it.contractorBoqId) ?? 0) + (execByItem.get(it.id) ?? 0));
  }
  let projTotal = 0;
  let projExec = 0;
  for (const b of contractorBoqs) {
    projTotal += totalByBoq.get(b.id) ?? 0;
    projExec += execByBoq.get(b.id) ?? 0;
  }
  const expectedProgress = pctSafe(projExec, projTotal);
  check('progress.projectPercent', prog.projectPercent, expectedProgress);
  check('dashboard progress', dash.progress.projectPercent, expectedProgress);
  check('progress buildings count', prog.buildings.length, buildings.length);
  check('progress boqs count', prog.boqs.length, contractorBoqs.length);

  // Cost breakdown cross-check (matching rule replicated)
  const employerItems = await prisma.employerBoqItem.findMany({ where: { buildingId: { in: bids } } });
  const analytical = await prisma.analyticalBoqItem.findMany({ where: { buildingId: { in: bids } } });
  const cbItemByKey = new Map<string, (typeof cbItems)[number]>();
  for (const it of cbItems) cbItemByKey.set(`${it.contractorBoqId}|${it.itemCode}`, it);
  const boqByBuilding = new Map(bids.map((id) => [id, contractorBoqs.find((c) => c.buildingId === id)]));
  let costSum = 0;
  let matched = 0;
  for (const e of employerItems) {
    const boq = boqByBuilding.get(e.buildingId);
    const cItem = boq ? cbItemByKey.get(`${boq.id}|${e.itemCode}`) : undefined;
    if (cItem) {
      costSum += num(cItem.totalValue);
      matched++;
    }
  }
  check('cost.totals.employerValue', cost.totals.employerValue, BAC);
  check('cost.totals.contractorValue', cost.totals.contractorValue, round2(costSum));
  check('cost.totals.profit', cost.totals.profit, round2(BAC - costSum));
  check('cost.totals.margin', cost.totals.margin, pctSafe(BAC - costSum, BAC));
  check('matched employer items', cost.items.length, employerItems.length);
  check('items with contractor value', cost.items.filter((i: any) => i.contractorValue !== null).length, matched);

  // BOQ intelligence
  check('boq.topProfit is array', Array.isArray(cost.items), true);
  if (cost.items.length > 0) {
    const items = [...cost.items] as any[];
    const topProfit = [...items].sort((a, b) => b.profit - a.profit).slice(0, 10).map((i) => i.itemCode);
    check('boq.topProfit order', dash.boq.topProfit.map((i: any) => i.itemCode).join(','), topProfit.join(','));
    const totalProfit = round2(items.reduce((s: number, i: any) => s + num(i.profit), 0));
    check('boq items profit sums to totals', totalProfit, cost.totals.profit);
  }

  // Treasury cross-check
  const ft = await prisma.fundTransaction.findMany({
    where: { fund: { projectId }, status: { in: ['approved', 'pending'] } },
  });
  const approved = ft.filter((t) => t.status === 'approved');
  const cashIn = round2(approved.filter((t) => t.type === 'add').reduce((s, t) => s + num(t.amount), 0));
  const cashOut = round2(approved.filter((t) => t.type === 'deduct').reduce((s, t) => s + num(t.amount), 0));
  check('treasury.cashIn', treas.cashIn, cashIn);
  check('treasury.cashOut', treas.cashOut, cashOut);
  check('treasury.netCashFlow', treas.netCashFlow, round2(cashIn - cashOut));
  const fund = await prisma.projectFund.findUnique({ where: { projectId } });
  check('treasury.balance', treas.balance, num(fund?.currentBalance ?? 0));
  const committed = round2((await Promise.all(
    (await prisma.statement.findMany({ where: { contractorBoqId: { in: cboqIds } }, select: { id: true, netPayable: true } })).map(async (s) => {
      const paid = num((await prisma.payment.aggregate({ where: { statementId: s.id }, _sum: { amount: true } }))._sum?.amount);
      return Math.max(0, num(s.netPayable) - paid);
    }),
  )).reduce((a, b) => a + b, 0));
  check('treasury.committedPayments', treas.committedPayments, committed);

  // Purchases cross-check
  const purchases = await prisma.purchase.findMany({ where: { projectId } });
  const actual = round2(purchases.filter((p) => p.status !== 'cancelled').reduce((s, p) => s + num(p.total), 0));
  const budget = round2(cbItems.filter((i) => classifyCostType(i.description, i.unit) === 'material').reduce((s, i) => s + num(i.totalValue), 0));
  check('purchases.actualPurchases', purch.actualPurchases, actual);
  check('purchases.purchaseBudget', purch.purchaseBudget, budget);
  check('purchases.costOverrun', purch.costOverrun, round2(actual - budget));
  check('purchases.openOrders.count', purch.openOrders.count, purchases.filter((p) => p.status === 'pending' || p.status === 'approved').length);
  check('purchases.delivered.count', purch.delivered.count, purchases.filter((p) => p.status === 'received').length);

  // Inventory cross-check
  const invItems = await prisma.inventoryItem.findMany({ where: { deletedAt: null } });
  const movs = await prisma.stockMovement.findMany();
  const consumption = round2(movs.filter((m) => m.type === 'ISSUE').reduce((s, m) => s + num(m.quantity), 0));
  const received = round2(movs.filter((m) => m.type === 'RECEIVE').reduce((s, m) => s + num(m.quantity), 0));
  const currentStock = round2(invItems.reduce((s, i) => s + num(i.quantity), 0));
  const invValue = round2(invItems.reduce((s, i) => s + num(i.quantity) * num(i.price), 0));
  const consumedValue = round2(movs.filter((m) => m.type === 'ISSUE').reduce((s, m) => s + num(m.quantity) * (num(invItems.find((i) => i.id === m.itemId)?.price ?? 0)), 0));
  check('inventory.consumption', inv.consumption, consumption);
  check('inventory.received', inv.received, received);
  check('inventory.currentStock', inv.currentStock, currentStock);
  check('inventory.inventoryValue', inv.inventoryValue, invValue);
  check('inventory.materialCost', inv.materialCost, consumedValue);
  check('inventory.turnover', inv.turnover, round2(invValue > 0 ? consumedValue / invValue : 0));

  // Employees cross-check
  const att = await prisma.attendance.findMany({ where: { projectId } });
  const present = att.filter((a) => ['present', 'checkedin', 'checkedout', 'late', 'pending'].includes(a.attendanceStatus.toLowerCase())).length;
  const late = att.filter((a) => a.attendanceStatus.toLowerCase() === 'late' || a.status.toLowerCase() === 'late').length;
  const absent = att.filter((a) => a.attendanceStatus.toLowerCase() === 'absent' || a.status.toLowerCase() === 'absent').length;
  const workedHours = round2(att.reduce((s, a) => s + (num(a.workedMinutes ?? 0) / 60 + num(a.hoursWorked)), 0));
  check('employees.totalRecords', emp.totalRecords, att.length);
  check('employees.present', emp.present, present);
  check('employees.late', emp.late, late);
  check('employees.absent', emp.absent, absent);
  check('employees.attendanceRate', emp.attendanceRate, att.length > 0 ? round2((present / att.length) * 100) : 100);
  check('employees.workedHours', emp.workedHours, workedHours);
  const activeEmp = await prisma.employee.findMany({ where: { deletedAt: null, status: 'active' } });
  check('employees.payrollCost', emp.payrollCost, round2(activeEmp.reduce((s, e) => s + num(e.salary), 0)));

  // Risks: score consistency + no crashes
  check('risks has items array', Array.isArray(risks.items), true);
  check('risks counts match items', risks.score.counts.high + risks.score.counts.medium + risks.score.counts.low + risks.score.counts.critical, risks.items.length);
  let wsum = 0;
  const w: Record<string, number> = { critical: 100, high: 75, medium: 50, low: 25 };
  for (const r of risks.items) wsum += w[r.severity] * r.probability;
  const overall = risks.items.length > 0 ? round2(wsum / risks.items.length) : 0;
  check('risks.score.overall', risks.score.overall, overall);
  const level = overall >= 75 ? 'critical' : overall >= 50 ? 'high' : overall >= 25 ? 'medium' : 'low';
  check('risks.score.level', risks.score.level, level);
  check('pending approvals KPI', dash.kpis.pending_approvals.value, pendingApprovals);

  // Cross-endpoint consistency
  check('dashboard.evm == /evm', dash.evm.eac, evm.eac);
  check('dashboard.progress == /progress', dash.progress.projectPercent, prog.projectPercent);
  check('dashboard.cost == /cost', dash.cost.profit, cost.totals.profit);
  check('dashboard.treasury == /treasury', dash.treasury.balance, treas.balance);
  check('dashboard.purchases == /purchases', dash.purchases.actualPurchases, purch.actualPurchases);
  check('dashboard.inventory == /inventory', dash.inventory.inventoryValue, inv.inventoryValue);
  check('dashboard.employees == /employees', dash.employees.attendanceRate, emp.attendanceRate);
  check('dashboard.risks == /risks', dash.risks.score.overall, risks.score.overall);
}

async function main() {
  const token = await login();
  if (!token) throw new Error('login failed');
  const projects = await getApi(token, '/analytics/projects');

  for (const p of projects) {
    await verifyProject(token, p.id);
  }

  console.log(`\n\n===== SUMMARY =====`);
  console.log(`PASS: ${pass}  FAIL: ${fail}`);
  if (failures.length) {
    console.log('--- Failures ---');
    for (const f of failures) console.log('  ' + f);
  }
  process.exitCode = fail > 0 ? 1 : 0;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
