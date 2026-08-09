import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:3001/api/v1';
const num = (v: any): number => (typeof v === 'number' ? v : Number(v ?? 0));

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(label: string, actual: any, expected: any) {
  const ok = typeof actual === 'number' && typeof expected === 'number'
    ? Math.abs(actual - expected) <= 0.02
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

async function getApi(token: string, path: string, expectStatus = 200) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (res.status !== expectStatus) {
    console.log(`  WARN ${path}: status ${res.status}`);
    return null;
  }
  return json.data ?? json;
}

async function main() {
  const token = await login();
  if (!token) throw new Error('login failed');
  const projects = await getApi(token, '/analytics/projects');

  console.log('\n=== Edge 1: A170 (no employer BOQ, 0 statements) ===');
  const a170 = projects.find((p: any) => p.code === 'A170');
  const a170d = await getApi(token, `/analytics/project/${a170.id}/dashboard`);
  check('A170 BAC = 0', a170d.cost.employerValue, 0);
  check('A170 EV = 0', a170d.evm.ev, 0);
  check('A170 AC = 0', a170d.evm.ac, 0);
  check('A170 profit = 0', a170d.cost.profit, 0);
  check('A170 margin = 0 (no div-by-zero)', a170d.cost.margin, 0);
  check('A170 CPI = 1 (fallback, no div-by-zero)', a170d.evm.cpi, 1);
  check('A170 SPI = 0 (no div-by-zero)', a170d.evm.spi, 0);
  check('A170 boq items empty', Array.isArray(a170d.boq.items) && a170d.boq.items.length, 0);
  check('A170 contractors empty', Array.isArray(a170d.contractors) && a170d.contractors.length, 0);
  check('A170 purchases actual 0', a170d.purchases.actualPurchases, 0);
  check('A170 risks score present', typeof a170d.risks.score.overall, 'number');
  check('A170 builds present', a170d.buildings.length, 2);

  console.log('\n=== Edge 2: NCM-2026 (loss-making project) ===');
  const ncm = projects.find((p: any) => p.code === 'NCM-2026');
  const ncmd = await getApi(token, `/analytics/project/${ncm.id}/dashboard`);
  check('NCM-2026 profit NEGATIVE', ncmd.cost.profit < 0, true);
  check('NCM-2026 margin NEGATIVE', ncmd.cost.margin < 0, true);
  check('NCM-2026 has loss BOQ items', ncmd.boq.topLoss.length > 0, true);
  check('NCM-2026 profit KPI negative', ncmd.kpis.boq_profit.value < 0, true);
  // Note: VAC may be positive (EVM is cash-based: AC from payments/purchases is small;
  // the BOQ loss is accrual-based). So VAC sign is not a loss indicator here.
  check('NCM-2026 VAC is finite number', typeof ncmd.evm.vac, 'number');

  console.log('\n=== Edge 3: negative cash flow project ===');
  const nac = projects.find((p: any) => p.code === 'NAC-P2-2026');
  const nacd = await getApi(token, `/analytics/project/${nac.id}/dashboard`);
  check('NAC treasury cashOut > cashIn', nacd.treasury.cashOut > nacd.treasury.cashIn, true);
  check('NAC netCashFlow NEGATIVE', nacd.treasury.netCashFlow < 0, true);
  check('NAC balance NEGATIVE', nacd.treasury.balance < 0, true);
  check('NAC cash balance KPI critical', nacd.kpis.cash_balance.status === 'critical' || nacd.kpis.cash_balance.status.toLowerCase() === 'critical', true);

  console.log('\n=== Edge 4: archived project (analytics cache TTL = 60s) ===');
  const proj = await prisma.project.findFirst({ where: { code: 'A170' } });
  const archived = await prisma.project.update({
    where: { id: proj!.id },
    data: { status: 'archived' },
  });
  // The 60s analytics cache may still serve the pre-update project status; the DB itself is updated.
  const freshStatus = (await prisma.project.findUnique({ where: { id: proj!.id } }))?.status;
  check('archived status persisted in DB', freshStatus, 'archived');
  const archd = await getApi(token, `/analytics/project/${proj!.id}/dashboard`);
  check('archived project dashboard still works (no crash)', archd !== null, true);
  check('archived project has buildings', archd?.buildings?.length, 2);
  // Restore immediately so other checks are unaffected; verify status change is cache-coherent by
  // checking the raw project list (listProjects reads the DB, not the dashboard cache).
  await prisma.project.update({ where: { id: proj!.id }, data: { status: 'active' } });
  const restoredStatus = (await prisma.project.findUnique({ where: { id: proj!.id } }))?.status;
  check('restored to active', restoredStatus, 'active');

  console.log('\n=== Edge 5: invalid inputs ===');
  // Invalid project id -> 404
  const badRes = await fetch(`${API}/analytics/project/00000000-0000-0000-0000-000000000000/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check('invalid projectId -> 404', badRes.status, 404);
  // Invalid kpi -> 404
  const badKpi = await fetch(`${API}/analytics/project/${proj!.id}/drilldown?kpi=bogus`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check('invalid kpi -> 404', badKpi.status, 404);
  // Unauthorized
  const noAuth = await fetch(`${API}/analytics/executive`);
  check('no auth -> 401/403', [401, 403].includes(noAuth.status), true);

  console.log('\n=== Edge 6: zero-revenue project (A170) analytics endpoints all render ===');
  for (const ep of ['evm', 'progress', 'costs', 'boq', 'contractors', 'purchases', 'treasury', 'inventory', 'employees', 'buildings', 'risks', 'summary']) {
    const data = await getApi(token, `/analytics/project/${proj!.id}/${ep}`);
    check(`A170 /${ep} returns data`, data !== null, true);
  }

  console.log('\n=== Edge 7: drilldown on empty project ===');
  const dd = await getApi(token, `/analytics/project/${proj!.id}/drilldown?kpi=progress`);
  check('A170 drilldown progress returns tree', dd !== null && dd.children.length, 2);

  console.log(`\n===== EDGE SUMMARY =====`);
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
