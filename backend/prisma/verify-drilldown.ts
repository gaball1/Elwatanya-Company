import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:3001/api/v1';
const num = (v: any): number => (typeof v === 'number' ? v : Number(v ?? 0));
const round2 = (v: number) => Math.round(v * 100) / 100;

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(label: string, actual: any, expected: any, tol = 0.02) {
  const ok = typeof actual === 'number' && typeof expected === 'number'
    ? Math.abs(actual - expected) <= tol
    : String(actual) === String(expected);
  if (ok) pass++;
  else {
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

async function verifyDrilldown(token: string, projectId: string) {
  console.log(`\n=== Drill-down ${projectId} ===`);
  const [dash, ddProgress, ddCost, ddRevenue, ddProfit] = await Promise.all([
    getApi(token, `/analytics/project/${projectId}/dashboard`),
    getApi(token, `/analytics/project/${projectId}/drilldown?kpi=progress`),
    getApi(token, `/analytics/project/${projectId}/drilldown?kpi=cost`),
    getApi(token, `/analytics/project/${projectId}/drilldown?kpi=revenue`),
    getApi(token, `/analytics/project/${projectId}/drilldown?kpi=profit`),
  ]);

  // Raw data
  const buildings = await prisma.building.findMany({ where: { projectId, deletedAt: null } });
  const bids = buildings.map((b) => b.id);
  const contractorBoqs = await prisma.contractorBoq.findMany({ where: { buildingId: { in: bids } } });
  const cboqIds = contractorBoqs.map((c) => c.id);
  const cbItems = await prisma.contractorBoqItem.findMany({ where: { contractorBoqId: { in: cboqIds } } });
  const statements = await prisma.statement.findMany({ where: { contractorBoqId: { in: cboqIds } } });
  const sidSet = new Set(statements.map((s) => s.id));
  const payments = await prisma.payment.findMany({ where: { statementId: { in: [...sidSet] } } });

  // Tree structure
  check('root level=project', ddProgress.level, 'project');
  check('root id = project id', ddProgress.id, projectId);
  check('root name = project name', ddProgress.name, dash.project?.name ?? '');
  check('building count', ddProgress.children.length, buildings.length);
  check('boq count across tree', ddProgress.children.reduce((s: number, b: any) => s + b.children.length, 0), contractorBoqs.length);

  // Root value references
  check('progress root = dashboard progress', ddProgress.value, dash.progress.projectPercent, 0.11);
  check('cost root = contractorValue', ddCost.value, dash.cost.contractorValue, 0.11);
  check('revenue root = employerValue', ddRevenue.value, dash.cost.employerValue, 0.11);
  check('profit root = profit', ddProfit.value, dash.cost.profit, 0.11);

  // Independent rollups per building
  const itemsByBuilding = new Map<string, any[]>();
  const cbByBuilding = new Map<string, any[]>();
  for (const b of buildings) itemsByBuilding.set(b.id, []);
  for (const cb of contractorBoqs) {
    if (!cbByBuilding.has(cb.buildingId)) cbByBuilding.set(cb.buildingId, []);
    cbByBuilding.get(cb.buildingId)!.push(cb);
  }

  for (const b of buildings) {
    const ddBuilding = ddCost.children.find((x: any) => x.id === b.id);
    check(`cost building ${b.name} level`, ddBuilding?.level, 'building');
    const bCb = cbByBuilding.get(b.id) ?? [];
    const bCbIds = bCb.map((c) => c.id);
    // cost building node = matched contractor items (employer itemCode <-> contractor itemCode)
    const employerItems = await prisma.employerBoqItem.findMany({ where: { buildingId: b.id } });
    const cbItemsForBuilding = cbItems.filter((i) => bCbIds.includes(i.contractorBoqId));
    const cbItemByKey = new Map<string, any>();
    for (const it of cbItemsForBuilding) cbItemByKey.set(`${it.contractorBoqId}|${it.itemCode}`, it);
    const primaryBoq = bCb[0];
    let expectedCost = 0;
    for (const e of employerItems) {
      const matched = primaryBoq ? cbItemByKey.get(`${primaryBoq.id}|${e.itemCode}`) : undefined;
      if (matched) expectedCost += num(matched.totalValue);
    }
    expectedCost = round2(expectedCost);
    check(`cost building ${b.name} value`, ddBuilding?.value, expectedCost);
    check(`cost building ${b.name} boq count`, ddBuilding?.children.length, bCb.length);

    for (const cb of bCb) {
      const ddBoq = ddBuilding?.children.find((x: any) => x.id === cb.id);
      check(`cost boq ${cb.workType} level`, ddBoq?.level, 'boq');
      const cbItemsForBoq = cbItems.filter((i) => i.contractorBoqId === cb.id);
      const expectedBoq = round2(cbItemsForBoq.reduce((s, i) => s + num(i.totalValue), 0));
      check(`cost boq ${cb.workType} value`, ddBoq?.value, expectedBoq);
      const stmts = statements.filter((s) => s.contractorBoqId === cb.id);
      check(`boq ${cb.workType} extract count`, ddBoq?.children.length, stmts.length);
      const expectedExtracts = stmts.map((s) => round2(num(s.netPayable))).sort((a, b) => a - b);
      const actualExtracts = (ddBoq?.children ?? []).map((c: any) => c.value).sort((a: number, b: number) => a - b);
      check(`boq ${cb.workType} extract values`, actualExtracts.join(','), expectedExtracts.join(','));
      const pays = payments.filter((p) => stmts.some((s) => s.id === p.statementId));
      const totalPayChildCount = (ddBoq?.children ?? []).reduce((s: number, c: any) => s + c.children.length, 0);
      check(`boq ${cb.workType} total payment nodes`, totalPayChildCount, pays.length);
    }
  }

  // Progress tree per-building percent
  for (const b of buildings) {
    const ddBuilding = ddProgress.children.find((x: any) => x.id === b.id);
    const expectedPct = dash.progress.buildings.find((x: any) => x.id === b.id)?.percent ?? 0;
    check(`progress building ${b.name} %`, ddBuilding?.value, expectedPct, 0.11);
  }

  // Profit root = sum of building profit nodes (consistency)
  const profitSum = round2(ddProfit.children.reduce((s: number, b: any) => s + b.value, 0));
  check('profit = sum of building profits', ddProfit.value, profitSum, 0.11);
  const costSum = round2(ddCost.children.reduce((s: number, b: any) => s + b.value, 0));
  check('cost = sum of building costs', ddCost.value, costSum, 0.11);
  const revSum = round2(ddRevenue.children.reduce((s: number, b: any) => s + b.value, 0));
  check('revenue = sum of building revenues', ddRevenue.value, revSum, 0.11);

  // Display strings
  check('cost root display has EGP', ddCost.display.includes('EGP'), true);
  check('progress root display has %', ddProgress.display.includes('%'), true);
}

async function main() {
  const token = await login();
  if (!token) throw new Error('login failed');
  const projects = await getApi(token, '/analytics/projects');

  // Invalid KPI must 404
  const badRes = await fetch(`${API}/analytics/project/${projects[0].id}/drilldown?kpi=bogus`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const badJson = await badRes.json();
  check('invalid kpi rejected', badRes.status, 404);
  check('invalid kpi message', typeof badJson.message, 'string');

  for (const p of projects) {
    await verifyDrilldown(token, p.id);
  }

  console.log(`\n\n===== DRILLDOWN SUMMARY =====`);
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
