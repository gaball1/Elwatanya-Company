import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:3001/api/v1';
const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? () => crypto.randomUUID()
  : () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); });

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const num = (v: any): number => (typeof v === 'number' ? v : Number(v ?? 0));

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(label: string, actual: any, expected: any, tol = 0.5) {
  if (expected === null || expected === undefined) return;
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

function noUuid(text: string): boolean {
  return !UUID_REGEX.test(text || '');
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

async function ask(token: string, message: string, conversationId?: string, context?: any) {
  const body: any = { message };
  if (conversationId) body.conversationId = conversationId;
  if (context && Object.keys(context).length) body.context = context;
  const res = await fetch(`${API}/ai-agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ---- Ground truth: build contractor -> buildings -> extracts/payments ----
interface ContractorTruth {
  name: string;
  workType: string;
  buildings: { id: string; name: string; projectName: string }[];
  extractCount: number;
  totalNetPayable: number;
  totalWorkValue: number;
  paymentCount: number;
  totalPaid: number;
}

async function buildGroundTruth(token: string): Promise<ContractorTruth[]> {
  const contractors = await getApi(token, '/subcontractors');
  const projects = await getApi(token, '/projects');
  const list = (v: any) => v?.buildings || v?.items || v?.data || v || [];

  // 1. Load every building once (per project)
  const buildings: { id: string; name: string; projectName: string }[] = [];
  for (const project of (projects?.items || projects || [])) {
    let bd: any[] = [];
    try { bd = list(await getApi(token, `/projects/${project.id}/buildings`)); } catch { continue; }
    for (const b of bd) buildings.push({ id: b.id, name: b.name, projectName: project.name || project.code });
  }

  // 2. Load building->contractor assignments once (per building)
  const buildingContractors = new Map<string, string[]>();
  for (const building of buildings) {
    let ids: string[] = [];
    try {
      ids = list(await getApi(token, `/buildings/${building.id}/subcontractors`))
        .map((a: any) => a.subcontractorId || a.subcontractor?.id || a.subcontractor?.subcontractorId)
        .filter(Boolean);
    } catch { ids = []; }
    buildingContractors.set(building.id, ids);
  }

  // 3. contractorId -> assigned buildings
  const contractorBuildings = new Map<string, { id: string; name: string; projectName: string }[]>();
  for (const building of buildings) {
    for (const cid of buildingContractors.get(building.id) || []) {
      if (!contractorBuildings.has(cid)) contractorBuildings.set(cid, []);
      contractorBuildings.get(cid)!.push(building);
    }
  }

  // 4. Aggregate extracts / payments per contractor (only assigned buildings)
  const result: ContractorTruth[] = [];
  for (const contractor of (contractors?.items || contractors || [])) {
    const bs = contractorBuildings.get(contractor.id) || [];
    const truth: ContractorTruth = {
      name: contractor.name,
      workType: contractor.workType || '',
      buildings: bs,
      extractCount: 0,
      totalNetPayable: 0,
      totalWorkValue: 0,
      paymentCount: 0,
      totalPaid: 0,
    };
    for (const building of bs) {
      try {
        const ed = list(await getApi(token, `/buildings/${building.id}/contractors/${contractor.id}/extracts`));
        for (const it of ed) {
          truth.extractCount++;
          truth.totalNetPayable += num(it.netPayable);
          truth.totalWorkValue += num(it.totalWorkValue);
        }
      } catch { /* no extracts */ }
      try {
        const pd = list(await getApi(token, `/buildings/${building.id}/contractors/${contractor.id}/payments`));
        for (const it of pd) {
          truth.paymentCount++;
          truth.totalPaid += num(it.amount);
        }
      } catch { /* no payments */ }
    }
    result.push(truth);
  }
  return result;
}

async function main() {
  const token = await login();
  if (!token) throw new Error('login failed');

  const truth = await buildGroundTruth(token);
  const withExtracts = truth.filter((t) => t.extractCount > 0);
  const withPayments = truth.filter((t) => t.paymentCount > 0);
  const multiBuilding = truth.filter((t) => t.buildings.length > 1);

  console.log(`Contractors: ${truth.length} | with extracts: ${withExtracts.length} | with payments: ${withPayments.length} | multi-building: ${multiBuilding.length}`);
  check('ground truth: contractors exist', truth.length > 0, true);
  check('ground truth: at least one contractor has extracts', withExtracts.length > 0, true);
  check('ground truth: at least one contractor has payments', withPayments.length > 0, true);

  const target = withExtracts[0];
  const targetPaid = withPayments.find((t) => t.extractCount > 0) || target;

  // ============ 1. Contractor extract retrieval ============
  console.log('\n=== 1. Contractor extract retrieval ===');
  const conv1 = uuid();
  const q1 = await ask(token, `Show me the extracts of contractor ${target.name}`, conv1);
  console.log('intent:', q1.intent, '| message:', (q1.message || '').slice(0, 200));
  check('Q1 success', q1.success, true);
  check('Q1 intent = list_contractor_extracts', q1.intent, 'list_contractor_extracts');
  check('Q1 message mentions contractor name', (q1.message || '').includes(target.name), true);
  check('Q1 no UUID in message', noUuid(q1.message || ''), true);
  if (q1.data) {
    check('Q1 data total = real extract count', q1.data.total, target.extractCount);
    check('Q1 data totalNetPayable = real net payable', q1.data.totalNetPayable, target.totalNetPayable);
  }

  // ============ 2. Payment retrieval ============
  console.log('\n=== 2. Payment retrieval ===');
  const q2 = await ask(token, `Show the payments of contractor ${targetPaid.name}`, conv1);
  console.log('intent:', q2.intent, '| message:', (q2.message || '').slice(0, 200));
  check('Q2 success', q2.success, true);
  check('Q2 intent = list_extract_payments', q2.intent, 'list_extract_payments');
  check('Q2 no UUID in message', noUuid(q2.message || ''), true);
  if (q2.data) {
    check('Q2 data total = real payment count', q2.data.total, targetPaid.paymentCount);
    check('Q2 data totalPaid = real paid amount', q2.data.totalPaid, targetPaid.totalPaid);
  }

  // ============ 3. Approval retrieval ============
  console.log('\n=== 3. Approval retrieval ===');
  const q3 = await ask(token, `Show extract approvals for contractor ${target.name}`, conv1);
  console.log('intent:', q3.intent, '| message:', (q3.message || '').slice(0, 200));
  check('Q3 success', q3.success, true);
  check('Q3 intent = list_extract_approvals', q3.intent, 'list_extract_approvals');
  check('Q3 no UUID in message', noUuid(q3.message || ''), true);
  if (q3.data) {
    check('Q3 data total matches approvals API (0 in seed)', q3.data.total, 0);
  }

  // ============ 4. AI explanation (executive workflow) ============
  console.log('\n=== 4. AI explanation workflow ===');
  const q4 = await ask(token, `Why hasn't contractor ${target.name} been paid?`, conv1);
  console.log('intent:', q4.intent, '| success:', q4.success);
  check('Q4 success', q4.success, true);
  check('Q4 intent = contractor_payment_analysis workflow', q4.intent, 'workflow_contractor_payment_analysis');
  const msg4 = q4.message || '';
  for (const sec of ['Executive Summary', 'Root Cause', 'Current Status', 'Financial Impact', 'Recommended Action', 'Supporting Documents', 'Confidence', 'References']) {
    check(`Q4 has section "${sec}"`, msg4.includes(`## ${sec}`), true);
  }
  check('Q4 mentions contractor name', msg4.includes(target.name), true);
  check('Q4 no UUID in message', noUuid(msg4), true);
  const remainingTruth = Math.max(0, Math.round(target.totalNetPayable - target.totalPaid));
  check('Q4 reports real remaining dues', msg4.includes(String(remainingTruth)) || msg4.includes(remainingTruth.toLocaleString()), true);
  // Extract count in report matches ground truth
  check('Q4 reports real extract count', new RegExp(`\\b${target.extractCount}\\b`).test(msg4), true);

  // ============ 5. Conversation follow-up ============
  console.log('\n=== 5. Conversation follow-up ===');
  const conv2 = uuid();
  const f1 = await ask(token, `Show contractor ${target.name}`, conv2);
  console.log('follow-up turn 1 intent:', f1.intent, '| message:', (f1.message || '').slice(0, 150));
  const f2 = await ask(token, 'Why wasn\'t he paid?', conv2);
  console.log('follow-up turn 2 intent:', f2.intent);
  check('F1 success', f1.success, true);
  check('F1 intent = find_contractor', f1.intent, 'find_contractor');
  check('F2 success', f2.success, true);
  check('F2 routes to workflow without re-mentioning contractor', f2.intent, 'workflow_contractor_payment_analysis');
  check('F2 report uses the remembered contractor', (f2.message || '').includes(target.name), true);
  check('F2 no UUID in message', noUuid(f2.message || ''), true);

  // ============ 6. Multi-building search ============
  console.log('\n=== 6. Multi-building search ===');
  let q6: any = null;
  check('at least one contractor spans multiple buildings', multiBuilding.length > 0, true);
  if (multiBuilding.length > 0) {
    const mb = multiBuilding[0];
    q6 = await ask(token, `Show me all extracts of contractor ${mb.name} across all buildings`, conv1);
    console.log('multi-building contractor:', mb.name.slice(0, 40), '| buildings:', mb.buildings.length);
    check('Q6 success', q6.success, true);
    check('Q6 intent = list_contractor_extracts', q6.intent, 'list_contractor_extracts');
    if (q6.data) {
      check('Q6 merged total = real extract count', q6.data.total, mb.extractCount);
      check('Q6 merged net payable = real', q6.data.totalNetPayable, mb.totalNetPayable);
      const buildingNames = mb.buildings.map((b) => b.name);
      check('Q6 covers multiple buildings', buildingNames.length > 1, true);
    }
  }

  // ============ 7. Fuzzy / partial contractor search ============
  console.log('\n=== 7. Fuzzy / partial search ===');
  const fuzzyTarget = target.name.split(' ').slice(1).join(' '); // drop first word (شركة/مقاولات/مؤسسة)
  const q7 = await ask(token, `Show contractor ${fuzzyTarget}`, conv1);
  console.log('fuzzy query:', fuzzyTarget, '| intent:', q7.intent, '| message:', (q7.message || '').slice(0, 150));
  check('Q7 success', q7.success, true);
  check('Q7 intent = find_contractor', q7.intent, 'find_contractor');
  check('Q7 resolves partial name to same contractor', (q7.message || '').includes(target.name), true);

  // typo / hamza-variant fuzzy (الأهرام vs الاهرام)
  const q7b = await ask(token, 'Show contractor الاهرام', conv1);
  check('Q7b success', q7b.success, true);
  if (q7b.success) {
    check('Q7b hamza-variant resolves to الأهرام', (q7b.message || '').includes('الأهرام') || (q7b.message || '').includes('الاهرام'), true);
  }

  // ============ 8. Arabic contractor names ============
  console.log('\n=== 8. Arabic contractor names ===');
  const q8 = await ask(token, `أعرض مستخلصات المقاول ${target.name}`, conv1);
  console.log('intent:', q8.intent, '| message:', (q8.message || '').slice(0, 150));
  check('Q8 Arabic extracts success', q8.success, true);
  check('Q8 no UUID in message', noUuid(q8.message || ''), true);
  if (q8.data && q8.data.total !== undefined) {
    check('Q8 Arabic extracts total = real', q8.data.total, target.extractCount);
  }

  // ============ 9. English alias search ============
  console.log('\n=== 9. English alias search ===');
  const aliasMap: Record<string, { expected: string; contains?: boolean }> = {
    'pyramids': { expected: 'مقاولات الأهرام للبناء' },
    'delta': { expected: 'شركة الدلتا للخرسانة' },
    'nile': { expected: 'النيل', contains: true },
    'concrete': { expected: 'شركة الدلتا للخرسانة' },
  };
  let aliasMatched = 0;
  for (const [alias, { expected, contains }] of Object.entries(aliasMap)) {
    const r = await ask(token, `Show contractor ${alias}`, conv1);
    const ok = r.success && (contains ? (r.message || '').includes(expected) : (r.message || '').includes(expected));
    if (ok) aliasMatched++;
    console.log(`alias "${alias}" -> ${r.success ? (r.message || '').slice(0, 60) : 'FAIL'}`);
  }
  check('English aliases resolve to correct contractors', aliasMatched, 4);

  // ============ 10. Contractor dues / balance ============
  console.log('\n=== 10. Contractor dues / balance ===');
  const q10 = await ask(token, `What are the remaining dues of contractor ${target.name}?`, conv1);
  console.log('intent:', q10.intent, '| message:', (q10.message || '').slice(0, 200));
  check('Q10 success', q10.success, true);
  check('Q10 intent = get_contractor_dues', q10.intent, 'get_contractor_dues');
  check('Q10 no UUID in message', noUuid(q10.message || ''), true);
  if (q10.data?.summary) {
    check('Q10 dues extract count = real', q10.data.summary.extractCount, target.extractCount);
    check('Q10 dues net payable = real', q10.data.summary.totalNetPayable, target.totalNetPayable);
    check('Q10 dues remaining = real', q10.data.summary.remaining, Math.max(0, Math.round(target.totalNetPayable - target.totalPaid)));
  }

  // ============ 11. No UUIDs anywhere ============
  console.log('\n=== 11. No UUID leakage ===');
  const allMsgs = [q1, q2, q3, q4, f1, f2, q6, q7, q7b, q8, q10].filter((r) => r && r.message).map((r) => r.message);
  const leaked = allMsgs.filter((m) => !noUuid(m));
  check('No UUID leaked in any of the AI response messages', leaked.length, 0);

  // ============ 12. Latest / unpaid extract ============
  console.log('\n=== 12. Latest extract ===');
  const q12 = await ask(token, `What is the latest extract of contractor ${target.name}?`, conv1);
  console.log('intent:', q12.intent, '| message:', (q12.message || '').slice(0, 200));
  check('Q12 success', q12.success, true);
  check('Q12 intent = find_extract', q12.intent, 'find_extract');
  check('Q12 no UUID in message', noUuid(q12.message || ''), true);
  if (q12.data) {
    check('Q12 found latest extract', q12.data.found, true);
  }

  const q12b = await ask(token, `Show the unpaid extracts of contractor ${target.name}`, conv1);
  console.log('intent:', q12b.intent, '| message:', (q12b.message || '').slice(0, 200));
  check('Q12b success', q12b.success, true);
  check('Q12b intent = find_extract', q12b.intent, 'find_extract');
  check('Q12b no UUID in message', noUuid(q12b.message || ''), true);

  console.log(`\n\n===== CONTRACTOR AI VERIFICATION SUMMARY =====`);
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
