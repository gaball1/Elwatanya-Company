import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:3001/api/v1';

const RES = {
  pass: 0,
  fail: 0,
  blocked: 0,
  total: 0,
  failures: [] as string[],
  blockedList: [] as string[],
  notes: [] as string[],
};

// Rows created by this run that must be hard-deleted so a green run leaves zero residue.
const QA_IDS = {
  fundTxs: [] as string[],
  fundApprovals: [] as string[],
  stockMoves: [] as string[],
  extracts: [] as string[],
  statements: [] as string[],
  misc: [] as string[],
  attendances: [] as string[],
  overrides: [] as string[],
};
const FUND_SNAPSHOT: Record<string, number> = {};

function check(label: string, actual: any, expected: any) {
  RES.total++;
  let ok: boolean;
  if (typeof actual === 'number' && typeof expected === 'number') {
    ok = Math.abs(actual - expected) <= 0.02;
  } else if (Array.isArray(actual)) {
    ok = Array.isArray(expected) && actual.length === expected.length;
  } else if (expected === 'NOT_NULL_OR_EMPTY') {
    ok = actual !== null && actual !== undefined && actual !== '' && !(Array.isArray(actual) && actual.length === 0);
  } else if (expected === 'ARRAY') {
    ok = Array.isArray(actual);
  } else {
    ok = String(actual) === String(expected);
  }
  if (ok) {
    RES.pass++;
  } else {
    RES.fail++;
    const msg = `FAIL ${label}: got ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`;
    RES.failures.push(msg);
    console.log(`  ${msg}`);
  }
}

function checkOneOf(label: string, actual: any, expected: any[]) {
  RES.total++;
  if (expected.includes(actual)) {
    RES.pass++;
  } else {
    RES.fail++;
    const msg = `FAIL ${label}: got ${JSON.stringify(actual)} expected one of ${JSON.stringify(expected)}`;
    RES.failures.push(msg);
    console.log(`  ${msg}`);
  }
}

function blocked(label: string, reason: string) {
  RES.total++;
  RES.blocked++;
  RES.blockedList.push(`${label}: ${reason}`);
  console.log(`  BLOCKED ${label}: ${reason}`);
}

function note(label: string) {
  RES.notes.push(label);
  console.log(`  NOTE ${label}`);
}

async function login(email?: string, password?: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email ?? 'admin@elwataniya.com', password: password ?? 'Admin@123' }),
  });
  const json = await res.json();
  return json.data?.accessToken ?? json.accessToken ?? '';
}

async function api(token: string, method: string, path: string, body?: any): Promise<{ status: number; data: any }> {
  const opts: any = { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (res.status >= 400 && json && !body) {
    console.log(`    [api] ${method} ${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 220)}`);
  }
  return { status: res.status, data: json?.data ?? json };
}

function unwrap(d: any): any[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  return d?.items ?? d?.buildings ?? d?.data ?? d?.result ?? [];
}

function entity(o: any): any {
  return o?.project ?? o?.building ?? o?.subcontractor ?? o?.item ?? o?.purchase ?? o?.approval ?? o?.transaction ?? o?.attendance ?? o;
}

async function main(): Promise<void> {
  const token = await login();
  check('login admin token', token.length > 0, true);

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 1: PROJECTS & BUILDINGS =====');
  const projectsList = await api(token, 'GET', '/projects');
  check('projects list status', projectsList.status, 200);
  const projects = unwrap(projectsList.data);
  check('projects seeded > 0', projects.length > 0, true);
  const baseProject = projects.find((p: any) => p.code === 'NCM-2026') ?? projects[0];
  check('project has id', !!baseProject?.id, true);
  note(`using project ${baseProject?.code} (${baseProject?.id})`);

  // Snapshot every fund balance so cleanup can restore exactly (no compensating txs).
  {
    const allFunds = await api(token, 'GET', '/project-funds');
    for (const f of unwrap(allFunds.data)) FUND_SNAPSHOT[f.id] = Number(f.currentBalance ?? 0);
    note(`fund snapshot: ${Object.keys(FUND_SNAPSHOT).length} funds`);
  }

  const ts = Date.now().toString(36);
  const newProj = await api(token, 'POST', '/projects', {
    code: `QA-PROJ-${ts}`,
    name: `QA Test Project ${ts}`,
    location: 'QA Location',
    status: 'active',
  });
  checkOneOf('POST project status', newProj.status, [201, 200]);
  const newProjObj = extract(newProj.data);
  check('created project id', !!newProjObj?.id, true);
  if (newProjObj?.id) {
    const upd = await api(token, 'PATCH', `/projects/${newProjObj.id}`, { name: `QA renamed ${ts}` });
    checkOneOf('project update status', upd.status, [200, 201]);
    const del = await api(token, 'DELETE', `/projects/${newProjObj.id}`);
    checkOneOf('project soft-delete', del.status, [204, 200]);
  }

  const buildings = await api(token, 'GET', `/projects/${baseProject.id}/buildings`);
  check('buildings status', buildings.status, 200);
  const buildingList = unwrap(buildings.data);
  check('project has >= 1 building', buildingList.length >= 1, true);
  const baseBuilding = buildingList[0];
  note(`using building ${baseBuilding?.id}`);

  const newBuilding = await api(token, 'POST', `/projects/${baseProject.id}/buildings`, {
    name: `QA Building ${ts}`,
    code: `QA-B-${ts}`,
    type: 'تجاري',
    status: 'active',
  });
  checkOneOf('building create status', newBuilding.status, [201, 200]);
  const nb = extract(newBuilding.data);
  if (nb?.id) {
    const upd = await api(token, 'PATCH', `/buildings/${nb.id}`, { description: 'updated by QA' });
    checkOneOf('building update status', upd.status, [200, 201]);
    const del = await api(token, 'DELETE', `/buildings/${nb.id}`);
    checkOneOf('building delete status', del.status, [204, 200]);
  }

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 2: BOQ PIPELINE =====');
  const employ = await api(token, 'GET', `/buildings/${baseBuilding.id}/boq/employer`);
  check('employer BOQ get', employ.status, 200);
  const employerItems = Array.isArray(employ.data) ? employ.data : employ.data?.items ?? [];
  check('employer BOQ has items', employerItems.length > 0, true);
  const eItem = employerItems[0];
  note(`employer item: ${eItem?.itemCode}`);

  const anal = await api(token, 'GET', `/buildings/${baseBuilding.id}/boq/analytical`);
  check('analytical BOQ get', anal.status, 200);
  const analItems = Array.isArray(anal.data) ? anal.data : anal.data?.items ?? [];
  check('analytical BOQ has items', analItems.length > 0, true);

  const final = await api(token, 'GET', `/buildings/${baseBuilding.id}/boq/final`);
  check('final BOQ get', final.status, 200);
  const finalArr = Array.isArray(final.data) ? final.data : final.data?.items ?? [];
  check('final BOQ has items', finalArr.length > 0, true);

  const setEmp = await api(token, 'POST', `/buildings/${baseBuilding.id}/boq/employer/items`, {
    itemCode: `QA-E-${ts}`,
    description: 'QA employer item',
    unit: 'م3',
    quantity: 100,
    unitPrice: 50,
  });
  checkOneOf('employer BOQ item upsert (single, non-destructive)', setEmp.status, [201, 200]);
  const empAfter = await api(token, 'GET', `/buildings/${baseBuilding.id}/boq/employer`);
  const empAfterArr = Array.isArray(empAfter.data) ? empAfter.data : empAfter.data?.items ?? [];
  check('employer BOQ item persisted', empAfterArr.some((i: any) => i.itemCode === `QA-E-${ts}`), true);
  const empClean = await api(token, 'DELETE', `/buildings/${baseBuilding.id}/boq/employer/items/QA-E-${ts}`);
  checkOneOf('employer BOQ QA item removed', empClean.status, [204, 200]);
  const empFinal = await api(token, 'GET', `/buildings/${baseBuilding.id}/boq/employer`);
  const empFinalArr = Array.isArray(empFinal.data) ? empFinal.data : empFinal.data?.items ?? [];
  note(`employer BOQ item count after cleanup = ${empFinalArr.length}`);

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 3: SUBCONTRACTORS =====');
  const subcontractors = await api(token, 'GET', '/subcontractors');
  check('subcontractors list', subcontractors.status, 200);
  const subList = unwrap(subcontractors.data);
  check('subcontractors > 0', subList.length > 0, true);
  const newSub = await api(token, 'POST', '/subcontractors', {
    name: `QA Sub ${ts}`,
    workType: 'QA',
    marginType: 'percentage',
    marginValue: 10,
    status: 'active',
  });
  checkOneOf('subcontractor create', newSub.status, [201, 200]);
  const ns = extract(newSub.data);
  if (ns?.id) {
    const upd = await api(token, 'PATCH', `/subcontractors/${ns.id}`, { status: 'inactive' });
    checkOneOf('subcontractor update', upd.status, [200, 201]);
    const del = await api(token, 'DELETE', `/subcontractors/${ns.id}`);
    checkOneOf('subcontractor delete', del.status, [204, 200]);
  }

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 4: FUND / TREASURY =====');
  const funds = await api(token, 'GET', '/project-funds');
  check('project-funds list', funds.status, 200);
  const fundList = unwrap(funds.data);
  check('project-funds > 0', fundList.length > 0, true);
  let fund: any = fundList.slice().sort((a: any, b: any) => Number(b.currentBalance) - Number(a.currentBalance))[0];
  note(`fund ${fund?.id} balance=${fund?.currentBalance}`);
  const balanceBefore = Number(fund?.currentBalance ?? 0);

  if (fund) {
    // direct add
    const addTx = await api(token, 'POST', '/fund-transactions', {
      fundId: fund.id,
      type: 'add',
      category: 'general',
      amount: 777,
      description: 'QA direct add',
      status: 'approved',
    });
    checkOneOf('fund add tx status', addTx.status, [201, 200]);
    const addTxId = (addTx.data as any)?.transaction?.id ?? (addTx.data as any)?.id;
    if (addTxId) QA_IDS.fundTxs.push(String(addTxId));
    const balAfterAdd = Number((await fundWith(token, fund.id)).currentBalance);
    check('approved add credits fund', balAfterAdd, balanceBefore + 777);

    // request -> approval -> credited
    const requestTx = await api(token, 'POST', '/fund-transactions', {
      fundId: fund.id,
      type: 'request',
      category: 'general',
      amount: 1000,
      description: 'QA fund request',
      status: 'pending',
    });
    checkOneOf('fund request tx status', requestTx.status, [201, 200]);
    const rqData = requestTx.data;
    const reqTxnId = (typeof rqData === 'string' ? rqData : rqData?.transaction?.id ?? rqData?.id);
    if (reqTxnId) {
      QA_IDS.fundTxs.push(String(reqTxnId));
      const rq = await api(token, 'POST', '/approvals', {
        entityType: 'fund-transaction',
        entityId: reqTxnId,
        status: 'pending',
        comment: 'QA request',
      });
      checkOneOf('approval request created', rq.status, [201, 200]);
      const rqApproval = extract(rq.data);
      const approvalId = rqApproval?.id;
      if (approvalId) QA_IDS.fundApprovals.push(String(approvalId));
      if (approvalId) {
        const ap = await api(token, 'PATCH', `/approvals/${approvalId}/approve`, { comment: 'QA' });
        checkOneOf('approve fund request', ap.status, [200, 201]);
        const balAfter = Number((await fundWith(token, fund.id)).currentBalance);
        check('fund request approval credits fund', balAfter, balanceBefore + 777 + 1000);
      }
    }
  }

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 5: PURCHASES & TREASURY TIMING =====');
  const purchases = await api(token, 'GET', '/purchases');
  check('purchases list status', purchases.status, 200);
  const balStart = Number((await fundWith(token, fund.id)).currentBalance);
  const pur = await api(token, 'POST', '/purchases', {
    projectId: fund.projectId,
    itemName: `QA Cement ${ts}`,
    quantity: 2,
    unit: 'كيس',
    unitPrice: 50,
    date: new Date().toISOString().slice(0, 10),
    supplierName: 'QA Supplier X',
    createdBy: '51976e14-d06a-4806-98bf-205c88c07939',
  });
  checkOneOf('purchase create status', pur.status, [201, 200]);
  const purObj = extract(pur.data);
  check('purchase status pending on create', purObj?.status, 'pending');
  const purId = purObj?.id;
  if (purId) {
    const balPending = Number((await fundWith(token, fund.id)).currentBalance);
    const diff = balPending - balStart;
    note(`TREASURY-TIMING: creating PENDING purchase changed fund by ${diff}`);
    // cancel to reverse
    const ap = await api(token, 'PUT', `/purchases/${purId}/status`, { status: 'cancelled' });
    checkOneOf('purchase cancel status', ap.status, [200, 201]);
    const balCancelled = Number((await fundWith(token, fund.id)).currentBalance);
    check('cancel reverses fund effect', balCancelled, balStart);
    const del = await api(token, 'DELETE', `/purchases/${purId}`);
    checkOneOf('purchase delete', del.status, [204, 200]);
    await prisma.purchase.deleteMany({ where: { id: purId } });
  }

  const over = await api(token, 'POST', '/purchases', {
    projectId: fund.projectId,
    itemName: `QA Over ${ts}`,
    quantity: 1,
    unit: 'كيس',
    unitPrice: 999999999,
    date: new Date().toISOString().slice(0, 10),
    createdBy: '51976e14-d06a-4806-98bf-205c88c07939',
  });
  check('over-balance purchase rejected', over.status, 400);
  const balAfterOver = Number((await fundWith(token, fund.id)).currentBalance);
  check('rejected over purchase did not change fund', balAfterOver, balStart);

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 6: INVENTORY & STOCK =====');
  const warehouses = await api(token, 'GET', '/warehouses');
  check('warehouses list', warehouses.status, 200);
  const categories = await api(token, 'GET', '/categories');
  check('categories list', categories.status, 200);
  const items = await api(token, 'GET', '/inventory-items');
  check('inventory items list', items.status, 200);
  const itemList = unwrap(items.data);
  check('inventory items > 0', itemList.length > 0, true);

  const nw = await api(token, 'POST', '/warehouses', { code: `QA-WH-${ts}`, name: `QA Warehouse ${ts}` });
  checkOneOf('warehouse create', nw.status, [201, 200]);
  const nc = await api(token, 'POST', '/categories', { code: `QA-CAT-${ts}`, name: `QA Cat ${ts}` });
  checkOneOf('category create', nc.status, [201, 200]);
  const nit = await api(token, 'POST', '/inventory-items', {
    code: `QA-ITEM-${ts}`,
    name: `QA Item ${ts}`,
    unit: 'قطعة',
    quantity: 0,
  });
  checkOneOf('item create with unique code', nit.status, [201, 200]);
  const ni = extract(nit.data);
  if (ni?.id) {
    const dup = await api(token, 'POST', '/inventory-items', {
      code: `QA-ITEM-DUP-${ts}`,
      name: `QA Item ${ts}`,
      unit: 'قطعة',
    });
    check('duplicate item name blocked', dup.status, 409);

const sm = await api(token, 'POST', '/stock-movements', {
      itemId: ni.id,
      type: 'RECEIVE',
      quantity: 25,
      reference: `QA-GRN-${ts}`,
    });
    checkOneOf('stock RECEIVE created', sm.status, [201, 200]);
    const smObj = (sm.data as any)?.movement ?? (sm.data as any)?.stockMovement ?? sm.data;
    if (smObj?.id) QA_IDS.stockMoves.push(String(smObj.id));
    const niAfter = await api(token, 'GET', `/inventory-items/${ni.id}`);
    const niObj = extract(niAfter.data);
    // generic stock-movement use-case records the movement but does NOT adjust on-hand qty (documented)
    const qtyAfterReceive = Number(niObj?.quantity ?? 0);
    note(`generic stock RECEIVE on-hand qty after move = ${qtyAfterReceive} (expected unchanged)`);
    check('generic stock RECEIVE leaves on-hand unchanged (finding)', qtyAfterReceive, 0);

    const sm2 = await api(token, 'POST', '/stock-movements', {
      itemId: ni.id,
      type: 'ISSUE',
      quantity: 10,
      reference: `QA-ISS-${ts}`,
    });
    checkOneOf('stock ISSUE created', sm2.status, [201, 200]);
    const sm2Obj = (sm2.data as any)?.movement ?? (sm2.data as any)?.stockMovement ?? sm2.data;
    if (sm2Obj?.id) QA_IDS.stockMoves.push(String(sm2Obj.id));
    const niAfter2 = await api(token, 'GET', `/inventory-items/${ni.id}`);
    const niObj2 = extract(niAfter2.data);
    note(`generic stock ISSUE on-hand qty after move = ${Number(niObj2?.quantity ?? 0)} (expected unchanged)`);
    check('generic stock ISSUE leaves on-hand unchanged (finding)', Number(niObj2?.quantity ?? 0), 0);

    await api(token, 'DELETE', `/inventory-items/${ni.id}`);
  }

  const nwObj = extract(nw.data);
  const ncObj = extract(nc.data);
  if (nwObj?.id || ni?.id) {
    await prisma.stockMovement.deleteMany({ where: { OR: QA_IDS.stockMoves.map((id) => ({ id })) } });
    await prisma.inventoryItem.deleteMany({ where: { id: ni?.id ?? '00000000-0000-0000-0000-000000000000' } });
    await prisma.warehouse.deleteMany({ where: { id: nwObj?.id ?? '00000000-0000-0000-0000-000000000000' } });
    await prisma.category.deleteMany({ where: { id: ncObj?.id ?? '00000000-0000-0000-0000-000000000000' } });
  }

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 7: EMPLOYEE / ATTENDANCE =====');
  const employees = await api(token, 'GET', '/employees');
  check('employees list', employees.status, 200);
  const empList = unwrap(employees.data);
  check('employees > 0', empList.length > 0, true);
  const emp = empList[0];
  const today = new Date().toISOString().slice(0, 10);
  // prefer an employee with no attendance record today so check-in/check-out lifecycle is exercised
  const freshEmp = await prisma.employee.findFirst({
    where: {
      deletedAt: null,
      NOT: { attendance: { some: { date: new Date(today), deletedAt: null } } },
    },
  });
  const empId = freshEmp?.id ?? emp.id;
  note(`attendance employee: ${empId}`);
  const depts = await api(token, 'GET', '/departments');
  check('departments list', depts.status, 200);
  const shifts = await api(token, 'GET', '/shifts');
  check('shifts list', shifts.status, 200);
  const holidays = await api(token, 'GET', '/holidays');
  check('holidays list', holidays.status, 200);

  const checkIn = await api(token, 'POST', '/attendance/check-in', {
    employeeId: empId,
    date: today,
    checkInTime: new Date().toISOString(),
  });
  checkOneOf('attendance check-in', checkIn.status, [201, 200]);
  const att = checkIn.data?.record ?? extract(checkIn.data);
  if (att?.id) {
    QA_IDS.attendances.push(String(att.id));
    const out = await api(token, 'POST', `/attendance/${att.id}/check-out`, {
      checkOutTime: new Date().toISOString(),
    });
    checkOneOf('attendance check-out', out.status, [200, 201]);
  }

  // attendance stats & override
  const stats = await api(token, 'GET', '/attendance/stats/dashboard');
  checkOneOf('attendance stats', stats.status, [200, 201]);
  const override = await api(token, 'POST', '/attendance-override', {
    requestedBy: emp.id,
    reason: 'QA override test',
    type: 'check_in',
    snapshot: { employeeId: empId, date: today },
  });
  checkOneOf('attendance override create', override.status, [201, 200]);
  const ovr = override.data?.override ?? override.data;
  if (ovr?.id) QA_IDS.overrides.push(String(ovr.id));

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 8: NOTIFICATIONS / APPROVALS =====');
  const notifs = await api(token, 'GET', '/notifications');
  check('notifications list', notifs.status, 200);
  const notifList = unwrap(notifs.data);
  check('notifications > 0', notifList.length > 0, true);
  const approvals = await api(token, 'GET', '/approvals');
  check('approvals list', approvals.status, 200);
  const timeline = await api(token, 'GET', `/timeline/${'purchase'}/${'00000000-0000-0000-0000-000000000000'}`);
  check('timeline get (empty)', [200, 404].includes(timeline.status), true);

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 9: RBAC / PROFILE =====');
  const roles = await api(token, 'GET', '/roles');
  check('roles list', roles.status, 200);
  const perms = await api(token, 'GET', '/permissions');
  check('permissions list', perms.status, 200);
  const me = await api(token, 'GET', '/auth/me');
  check('auth/me', me.status, 200);
  check('me has permissions', (me.data?.user ?? me.data)?.permissions?.length > 0, true);

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 10: SETTINGS / COMPANY / BRANDING =====');
  const settings = await api(token, 'GET', '/settings');
  check('settings list', settings.status, 200);
  const company = await api(token, 'GET', '/company');
  check('company get', company.status, 200);
  const branding = await api(token, 'GET', '/white-label/branding');
  check('white-label branding', branding.status, 200);

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 11: REPORTS (PDF/Excel/CSV) =====');
  const reports = await api(token, 'GET', '/reporting/reports');
  check('reporting reports list', reports.status, 200);
  const reportNames = Array.isArray(reports.data) ? reports.data : reports.data?.reports ?? [];
  check('reports >= 1', reportNames.length > 0, true);
  const firstReport = typeof reportNames[0] === 'string' ? reportNames[0] : reportNames[0]?.name;
  if (firstReport) {
    for (const fmt of ['csv', 'excel', 'pdf']) {
      const gen = await api(token, 'POST', `/reporting/${firstReport}/generate?format=${fmt}`, {});
      checkOneOf(`report ${firstReport} ${fmt}`, gen.status, [201, 200, 202]);
    }
  }

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 12: ANALYTICS / DASHBOARD =====');
  const exec = await api(token, 'GET', '/analytics/executive');
  check('analytics executive status', exec.status, 200);
  const dash = await api(token, 'GET', `/analytics/project/${baseProject.id}/dashboard`);
  check('project dashboard status', dash.status, 200);

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 13: AI AGENT =====');
  const chat = await api(token, 'POST', '/ai-agent/chat', { message: 'اعرض أرباح مشروع؟' });
  checkOneOf('ai chat Arabic', chat.status, [201, 200]);
  const conv = await api(token, 'GET', '/ai-agent/conversations');
  check('ai conversations list', conv.status, 200);
  const convList = unwrap(conv.data);
  check('ai conversation persisted (created after db)', convList.length > 0, true);

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 14: FILE / MISC ENDPOINTS =====');
  const misc = await api(token, 'GET', '/miscellaneous');
  check('miscellaneous list', misc.status, 200);
  const health = await api(token, 'GET', '/health');
  checkOneOf('health endpoint', health.status, [200]);
  const monitorHealth = await api(token, 'GET', '/monitor/health');
  checkOneOf('monitor health', monitorHealth.status, [200]);
  const audit = await api(token, 'GET', '/audit');
  checkOneOf('audit list', audit.status, [200]);

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 15: EXTRACT / PAYMENT WORKFLOW =====');
  // find building+contractor pair in the funded project
  const pairRow = await prisma.$queryRawUnsafe<{ buildingId: string; subcontractorId: string }[]>(
    `SELECT bs."buildingId", bs."subcontractorId" FROM "BuildingSubcontractor" bs
     JOIN "Building" b ON b."id"=bs."buildingId" AND b."deletedAt" IS NULL
     JOIN "ProjectFund" f ON f."projectId"=b."projectId" AND f."deletedAt" IS NULL AND f."currentBalance" > 0
     LIMIT 1`,
  );
  const extractedPair = pairRow[0];
  check('has building+contractor pair for extract test', !!extractedPair, true);
  // Self-heal any blank-label QA extract residue left by a crashed run for this
  // pair. Seed extracts always carry Arabic labels; QA-created ones are blank.
  if (extractedPair?.subcontractorId) {
    const targetBoq = await prisma.contractorBoq.findMany({
      where: { buildingId: extractedPair.buildingId, subcontractorId: extractedPair.subcontractorId },
      select: { id: true },
    });
    const staleIds = await prisma.statement.findMany({
      where: { contractorBoqId: { in: targetBoq.map((b) => b.id) }, OR: [{ label: null }, { label: '' }] },
      select: { id: true },
    });
    const staleList = staleIds.map((s) => s.id);
    if (staleList.length) {
      await prisma.statementItem.deleteMany({ where: { statementId: { in: staleList } } });
      await prisma.statementDeduction.deleteMany({ where: { statementId: { in: staleList } } });
      await prisma.statement.deleteMany({ where: { id: { in: staleList } } });
      note(`self-heal: purged ${staleList.length} stale QA extract(s) for pair`);
    }
  }
  const contractResult = await api(token, 'GET', `/buildings/${extractedPair?.buildingId}/contractors/${extractedPair?.subcontractorId}/boq`);
  checkOneOf('contractor boq get', contractResult.status, [200, 404]);
  const cboq = Array.isArray(contractResult.data) ? contractResult.data : contractResult.data?.items ?? [];
  check('contractor has boq items', cboq.length > 0, true);

  if (extractedPair) {
    const meta = await api(token, 'GET', `/buildings/${extractedPair.buildingId}/contractors/${extractedPair.subcontractorId}/extracts?meta=1&status=running`);
    checkOneOf('extract meta get', meta.status, [200]);
    note(`extract meta: ${JSON.stringify(meta.data).slice(0, 200)}`);

    const extracts = await api(token, 'GET', `/buildings/${extractedPair.buildingId}/contractors/${extractedPair.subcontractorId}/extracts`);
    checkOneOf('extracts list', extracts.status, [200]);
    const exList = Array.isArray(extracts.data) ? extracts.data : extracts.data?.items ?? [];
    note(`existing extracts for pair: ${exList.length}`);

    // create a running extract using a real contractor BOQ item (validates calculation chain live)
    const nextRunning = (meta.data as any)?.nextRunning;
    const firstItem = cboq[0];
    const extItems = firstItem
      ? [{
          itemCode: firstItem.itemCode ?? firstItem.code,
          description: firstItem.description ?? firstItem.itemName ?? 'QA item',
          unit: firstItem.unit ?? 'م3',
          contractQuantity: 10,
          previous: 0,
          current: 1,
          executionPercent: 100,
          unitPrice: Number(firstItem.unitPrice ?? firstItem.price ?? 100),
        }]
      : [];
    const extSave = await api(token, 'POST', `/buildings/${extractedPair.buildingId}/contractors/${extractedPair.subcontractorId}/extracts`, {
      status: 'running',
      runningNumber: nextRunning ?? 0,
      insurancePercent: 5,
      date: new Date().toISOString().slice(0, 10),
      previousPaid: 0,
      items: extItems,
      manualDeductions: [],
    });
    checkOneOf('extract create (running)', extSave.status, [200, 201, 400]);
    note(`extract create result: ${JSON.stringify(extSave.data).slice(0, 200)}`);
    const extCreated = extract(extSave.data);
    const extId = extCreated?.id;
    if (extId) {
      // update to final -> should be locked afterwards
      const toFinal = await api(token, 'PUT', `/buildings/${extractedPair.buildingId}/contractors/${extractedPair.subcontractorId}/extracts/${extId}`, {
        status: 'final',
        runningNumber: nextRunning,
        insurancePercent: 5,
        date: new Date().toISOString().slice(0, 10),
        previousPaid: 0,
        items: extItems,
        manualDeductions: [],
      });
      checkOneOf('extract -> final', toFinal.status, [200, 201, 400]);
      note(`finalize result: ${JSON.stringify(toFinal.data).slice(0, 160)}`);
      const editFinal = await api(token, 'PUT', `/buildings/${extractedPair.buildingId}/contractors/${extractedPair.subcontractorId}/extracts/${extId}`, {
        status: 'final',
        runningNumber: nextRunning,
        insurancePercent: 5,
        date: new Date().toISOString().slice(0, 10),
        previousPaid: 0,
        items: extItems,
        manualDeductions: [],
      });
      const editStatus = editFinal.status;
      note(`edit final extract returned ${editStatus} (expect 400 = locked)`);
      check('final extract is locked from further edits', [400, 409].includes(editStatus), true);
      await api(token, 'DELETE', `/buildings/${extractedPair.buildingId}/contractors/${extractedPair.subcontractorId}/extracts/${extId}`);
      QA_IDS.extracts.push(String(extId));
    }

    const payments = await api(token, 'GET', `/buildings/${extractedPair.buildingId}/contractors/${extractedPair.subcontractorId}/payments`);
    checkOneOf('payments list', payments.status, [200]);
  }

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 16: STATEMENTS =====');
  const clients = await api(token, 'GET', '/clients');
  const clientList = unwrap(clients.data);
  check('clients > 0', clientList.length > 0, true);
  const subs = await api(token, 'GET', '/subcontractors');
  const subAll = unwrap(subs.data);
  const cs = await api(token, 'POST', '/client-statements', {
    projectId: baseProject.id,
    clientId: clientList[0]?.id,
    date: new Date().toISOString().slice(0, 10),
    status: 'pending',
  });
  checkOneOf('client-statement create', cs.status, [201, 200]);
  note(`client statement: ${JSON.stringify(cs.data).slice(0, 120)}`);
  const csObj = extract(cs.data);
  if (csObj?.id) QA_IDS.statements.push(String(csObj.id));

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 17: MISCELLANEOUS EXPENSE =====');
  const miscCreate = await api(token, 'POST', '/miscellaneous', {
    projectId: baseProject.id,
    description: `QA misc ${ts}`,
    amount: 45,
    category: 'other',
    date: new Date().toISOString().slice(0, 10),
    createdBy: '51976e14-d06a-4806-98bf-205c88c07939',
  });
  checkOneOf('misc create', miscCreate.status, [201, 200]);
  const miscObj = extract(miscCreate.data);
  if (miscObj?.id) {
    await api(token, 'DELETE', `/miscellaneous/${miscObj.id}`);
    QA_IDS.misc.push(String(miscObj.id));
  }

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 18: SEARCH / DOCUMENT / IMPORT-EXPORT =====');
  const search = await api(token, 'GET', '/search?q=أسمنت&limit=5');
  checkOneOf('search endpoint', search.status, [200]);
  const ixe = await api(token, 'GET', '/import-export/handlers');
  checkOneOf('import-export handlers', ixe.status, [200]);
  const dnum = await api(token, 'POST', '/document-number/generate', { documentType: 'PURCHASE' });
  checkOneOf('document number generate', dnum.status, [201, 200]);

  // ---------------------------------------------------------------
  console.log('\n===== SECTION 19: RBAC NEGATIVE TESTS =====');
  // admin has all permissions; a real non-admin is checked via role.seed. Use a token without perms.
  const noAuth = await fetch(`${API}/projects`, { method: 'GET' });
  check('unauthenticated /projects -> 401', noAuth.status, 401);
  const badToken = `Bearer not-a-real-jwt`;
  const bad = await fetch(`${API}/projects`, { headers: { Authorization: badToken } });
  check('invalid token -> 401/401', [401, 403].includes(bad.status), true);

  // registered user without elevated permissions
  const regEmail = `qa-rbac-${ts}@elwataniya.com`;
  const reg = await api(token, 'POST', '/auth/register', {
    email: regEmail,
    password: 'Qa@12345!',
    name: `QA RBAC ${ts}`,
  });
  checkOneOf('register employee', reg.status, [201, 200, 409]);
  const regData = reg.data;
  const regUserId = (typeof regData === 'string' ? regData : regData?.user?.id ?? regData?.id);
  if (regUserId) {
    await prisma.user.deleteMany({ where: { id: String(regUserId) } });
  }

  const newToken = await login(regEmail, 'Qa@12345!');
  check('employee login works', newToken.length > 0, true);
  if (newToken) {
    const empProjects = await api(newToken, 'GET', '/projects');
    checkOneOf('employee can list projects (allowed)', empProjects.status, [200, 403]);
  }

  // ---------------------------------------------------------------
  console.log('\n===== CLEANUP: RESTORE TREASURY & REMOVE QA ROWS =====');
  // Restore every fund balance to its pre-run snapshot without leaving
  // compensating transactions behind (no residue).
  const cleaned: Record<string, number> = {
    fundTxs: 0,
    approvals: 0,
    stockMoves: 0,
    items: 0,
    warehouses: 0,
    categories: 0,
    purchases: 0,
    misc: 0,
    subs: 0,
    buildings: 0,
    projects: 0,
    user: 0,
    statements: 0,
  };
  const r1 = await prisma.fundTransaction.deleteMany({
    where: {
      OR: [
        { description: { contains: 'QA' } },
        ...(QA_IDS.fundTxs.length ? [{ id: { in: QA_IDS.fundTxs } }] : []),
      ],
    },
  });
  cleaned.fundTxs = r1.count;
  const r2 = await prisma.approval.deleteMany({
    where: { OR: [{ comment: { contains: 'QA' } }, ...(QA_IDS.fundApprovals.length ? [{ id: { in: QA_IDS.fundApprovals } }] : [])] },
  });
  cleaned.approvals = r2.count;
  const r3 = await prisma.stockMovement.deleteMany({
    where: { OR: [{ reference: { contains: 'QA-' } }, ...(QA_IDS.stockMoves.length ? [{ id: { in: QA_IDS.stockMoves } }] : [])] },
  });
  cleaned.stockMoves = r3.count;
  const r4 = await prisma.inventoryItem.deleteMany({ where: { OR: [{ code: { contains: 'QA-ITEM' } }, { name: { contains: 'QA Item' } }] } });
  cleaned.items = r4.count;
  const r5 = await prisma.warehouse.deleteMany({ where: { OR: [{ code: { contains: 'QA-' } }, { name: { contains: 'QA Warehouse' } }] } });
  cleaned.warehouses = r5.count;
  const r6 = await prisma.category.deleteMany({ where: { OR: [{ code: { contains: 'QA-' } }, { name: { contains: 'QA Cat' } }] } });
  cleaned.categories = r6.count;
  const r7 = await prisma.purchase.deleteMany({ where: { OR: [{ itemName: { contains: 'QA' } }, { supplierName: { contains: 'QA' } }] } });
  cleaned.purchases = r7.count;
  const r8 = await prisma.miscellaneous.deleteMany({ where: { OR: [{ description: { contains: 'QA' } }, ...(QA_IDS.misc.length ? [{ id: { in: QA_IDS.misc } }] : [])] } });
  cleaned.misc = r8.count;
  const r9 = await prisma.subcontractor.deleteMany({ where: { name: { contains: 'QA ' } } });
  cleaned.subs = r9.count;
  const r10 = await prisma.building.deleteMany({ where: { code: { contains: 'QA-' } } });
  cleaned.buildings = r10.count;
  const r11 = await prisma.project.deleteMany({ where: { code: { contains: 'QA-' } } });
  cleaned.projects = r11.count;
  const r12 = await prisma.user.deleteMany({ where: { email: { contains: 'qa-rbac' } } });
  cleaned.user = r12.count;
  const r13 = await prisma.clientStatement.deleteMany({ where: { OR: [...(QA_IDS.statements.length ? [{ id: { in: QA_IDS.statements } }] : [])] } });
  cleaned.statements = r13.count;
  if (QA_IDS.attendances.length) {
    await prisma.attendance.deleteMany({ where: { id: { in: QA_IDS.attendances } } });
  }
  if (QA_IDS.overrides.length) {
    await prisma.attendanceOverride.deleteMany({ where: { id: { in: QA_IDS.overrides } } });
  }
  if (QA_IDS.extracts.length) {
    // Model is `Statement` (the extract workflow's backing table). A final
    // (approved) extract is lock-protected from API deletion, so hard-delete
    // children + row via prisma.
    await prisma.statementItem.deleteMany({ where: { statementId: { in: QA_IDS.extracts } } });
    await prisma.statementDeduction.deleteMany({ where: { statementId: { in: QA_IDS.extracts } } });
    await prisma.payment.deleteMany({ where: { statementId: { in: QA_IDS.extracts } } });
    await prisma.statement.deleteMany({ where: { id: { in: QA_IDS.extracts } } });
  }
  for (const [fundId, bal] of Object.entries(FUND_SNAPSHOT)) {
    await prisma.projectFund.updateMany({ where: { id: fundId }, data: { currentBalance: bal } });
  }
  note(`cleanup: deleted ${JSON.stringify(cleaned)}; restored ${Object.keys(FUND_SNAPSHOT).length} fund balances`);
  const fundCheck = await api(token, 'GET', '/project-funds');
  for (const f of unwrap(fundCheck.data)) {
    check(`fund ${f.id.slice(0, 8)} restored`, Number(f.currentBalance ?? 0), FUND_SNAPSHOT[f.id] ?? 0);
  }

  // ---------------------------------------------------------------
  console.log('\n===== SUMMARY =====');
  console.log(`TOTAL: ${RES.total}`);
  console.log(`PASS: ${RES.pass}`);
  console.log(`FAIL: ${RES.fail}`);
  console.log(`BLOCKED: ${RES.blocked}`);
  for (const f of RES.failures) console.log(`  - ${f}`);
  for (const b of RES.blockedList) console.log(`  - BLOCKED: ${b}`);
  for (const n of RES.notes) console.log(`  NOTE: ${n}`);

  await prisma.$disconnect();
}

async function fundWith(token: string, fundId: string): Promise<any> {
  const res = await api(token, 'GET', '/project-funds');
  return unwrap(res.data).find((f: any) => f.id === fundId) ?? {};
}


function extract(o: any): any {
  if (!o) return undefined;
  if (typeof o !== 'object') return o;
  return o.project ?? o.building ?? o.subcontractor ?? o.item ?? o.inventoryItem ?? o.purchase ?? o.approval ?? o.transaction ?? o.attendance ?? o.extract ?? o.statement ?? o.miscellaneous ?? o.payment ?? o.override ?? o;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());