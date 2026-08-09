import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:3001/api/v1';
const num = (v: any): number => (typeof v === 'number' ? v : Number(v ?? 0));
const round2 = (v: number) => Math.round(v * 100) / 100;

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(label: string, actual: any, expected: any, tol = 0.5) {
  if (expected === null || expected === undefined) return; // skip unverifiable
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

async function ask(token: string, message: string, projectId?: string) {
  const body: any = { message };
  if (projectId) body.context = { projectId };
  const res = await fetch(`${API}/ai-agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return json;
}

async function main() {
  const token = await login();
  if (!token) throw new Error('login failed');

  const projects = await getApi(token, '/analytics/projects');
  const byCode: Record<string, any> = {};
  for (const p of projects) byCode[p.code] = p;

  const ncm = await getApi(token, `/analytics/project/${byCode['NCM-2026'].id}/dashboard`);
  const nct = await getApi(token, `/analytics/project/${byCode['NCT-2026'].id}/dashboard`);
  const cr3 = await getApi(token, `/analytics/project/${byCode['CR3-2026'].id}/dashboard`);

  // ---- 1. Why is NCM-2026 losing money? ----
  console.log('\n=== Q1: NCM-2026 losing project ===');
  const q1 = await ask(token, 'Why is the NCM-2026 project losing money? What is the main cause?', byCode['NCM-2026'].id);
  console.log('intent:', q1.intent, '| message:', q1.message?.slice(0, 300));
  console.log('data keys:', q1.data ? Object.keys(q1.data) : 'none');
  check('Q1 success', q1.success, true);
  check('Q1 routes to deep-analysis workflow', q1.intent, 'workflow_knowledge_fusion');
  // verify the loss figure if it appears in message or data
  const q1Text = JSON.stringify(q1);
  const lossMatch = q1Text.match(/[-\d,]{6,}/g) ?? [];
  console.log('  figures in response:', lossMatch.slice(0, 8).join(', '));
  // The dashboard profit for NCM-2026 should be negative (loss)
  check('NCM-2026 profit is negative (real loss)', ncm.cost.profit < 0, true);
  check('NCM-2026 margin negative', ncm.cost.margin < 0, true);

  // ---- 2. Highest-loss BOQ items in NCM-2026 ----
  console.log('\n=== Q2: NCM-2026 top loss BOQ items ===');
  const q2 = await ask(token, 'Which BOQ items have the highest loss in NCM-2026?', byCode['NCM-2026'].id);
  console.log('intent:', q2.intent, '| message:', q2.message?.slice(0, 300));
  const topLoss = ncm.boq.topLoss.slice(0, 3);
  check('Q2 success', q2.success, true);
  // message should mention the top loss item code
  if (topLoss.length > 0) {
    check('Q2 mentions top loss item code', (q2.message ?? '').includes(topLoss[0].itemCode) || JSON.stringify(q2.data ?? {}).includes(topLoss[0].itemCode), true);
  }
  check('NCM-2026 has real losses in topLoss', topLoss.length > 0, true);
  for (const it of topLoss) {
    check(`Q2 loss item ${it.itemCode} has negative profit`, it.profit < 0, true);
  }

  // ---- 3. Delayed contractors ----
  console.log('\n=== Q3: delayed contractors ===');
  const q3 = await ask(token, 'Which subcontractors are delayed on NCT-2026?', byCode['NCT-2026'].id);
  console.log('intent:', q3.intent, '| message:', q3.message?.slice(0, 300));
  const delayedNCT = nct.contractors.filter((c: any) => c.averageDelayDays > 0);
  check('Q3 success', q3.success, true);
  if (delayedNCT.length > 0) {
    check('Q3 mentions a delayed contractor', (q3.message ?? '').includes(delayedNCT[0].name) || JSON.stringify(q3.data ?? {}).includes(delayedNCT[0].name), true);
  } else {
    console.log('  NOTE: NCT-2026 has no delayed contractors');
  }

  // ---- 4. Budget vs purchases ----
  console.log('\n=== Q4: purchases vs budget ===');
  const q4 = await ask(token, 'Are purchases exceeding budget on CR3-2026?', byCode['CR3-2026'].id);
  console.log('intent:', q4.intent, '| message:', q4.message?.slice(0, 300));
  check('Q4 success', q4.success, true);
  const cr3Purch = await getApi(token, `/analytics/project/${byCode['CR3-2026'].id}/purchases`);
  console.log('  CR3 actual:', cr3Purch.actualPurchases, 'budget:', cr3Purch.purchaseBudget, 'overrun:', cr3Purch.costOverrun);
  // Seed data: no overrun (actual << budget). Agent must report the real state, not fabricate an overrun.
  check('CR3 has NO cost overrun in seed data', cr3Purch.costOverrun <= 0, true);
  const q4Text = JSON.stringify(q4);
  const overrunMention = /overrun|exceed|budget/i.test(q4.message ?? '') || /overrun|exceed/i.test(q4Text);
  check('Q4 responds about budget (not unknown)', q4.intent !== 'unknown', true);
  // The response must contain the REAL costOverrun value (no fabrication, no hallucination)
  const realOverrun = String(Math.round(cr3Purch.costOverrun));
  const realOverrunComma = cr3Purch.costOverrun.toLocaleString().replace(/,/g, '');
  check('Q4 returns real costOverrun value', q4Text.includes(realOverrun) || q4Text.includes(realOverrunComma), true);

  // ---- 4b. Risk level now routes to get_project_risks tool ----
  console.log('\n=== Q4b: risk level ===');
  const q4b = await ask(token, 'What is the risk level of NCM-2026?', byCode['NCM-2026'].id);
  console.log('intent:', q4b.intent, '| message:', q4b.message?.slice(0, 300));
  check('Q4b routes to get_project_risks', q4b.intent, 'get_project_risks');
  const ncmRisks2 = await getApi(token, `/analytics/project/${byCode['NCM-2026'].id}/risks`);
  const q4bData = JSON.stringify(q4b.data ?? {});
  check('Q4b data contains real risk score', q4bData.includes(String(ncmRisks2.score.overall)), true);

  // ---- 4c. Contractor analysis routes ----
  console.log('\n=== Q4c: delayed contractors ===');
  const q4c = await ask(token, 'Which subcontractors are delayed on NCT-2026?', byCode['NCT-2026'].id);
  console.log('intent:', q4c.intent, '| message:', q4c.message?.slice(0, 300));
  check('Q4c routes to contractor analysis', q4c.intent, 'get_contractor_analysis');
  const nctContractors = await getApi(token, `/analytics/project/${byCode['NCT-2026'].id}/contractors`);
  const delayedNCT2 = nctContractors.filter((c: any) => c.averageDelayDays > 0);
  if (delayedNCT2.length > 0) {
    check('Q4c data includes delayed contractor', JSON.stringify(q4c.data ?? {}).includes(delayedNCT2[0].name), true);
  }

  // ---- 4d. Profitability analysis routes ----
  console.log('\n=== Q4d: losing project ===');
  const q4d = await ask(token, 'Which BOQ items have the highest loss in NCM-2026?', byCode['NCM-2026'].id);
  console.log('intent:', q4d.intent, '| message:', q4d.message?.slice(0, 300));
  check('Q4d routes to profitability tool', q4d.intent, 'get_project_profitability');
  const ncmTopLoss = ncm.boq.topLoss[0];
  check('Q4d data includes top loss item', JSON.stringify(q4d.data ?? {}).includes(ncmTopLoss?.itemCode ?? '__none__'), ncmTopLoss !== undefined);

  // ---- 5. Cash flow ----
  console.log('\n=== Q5: cash flow ===');
  const q5 = await ask(token, 'What is the current cash flow situation for NCT-2026?', byCode['NCT-2026'].id);
  console.log('intent:', q5.intent, '| message:', q5.message?.slice(0, 300));
  const nctTreas = await getApi(token, `/analytics/project/${byCode['NCT-2026'].id}/treasury`);
  check('Q5 success', q5.success, true);
  console.log('  NCT netCashFlow:', nctTreas.netCashFlow, 'balance:', nctTreas.balance);
  const q5Text = JSON.stringify(q5);
  const absFlow = Math.abs(nctTreas.netCashFlow).toLocaleString();
  check('Q5 mentions real cash flow value', q5Text.includes(absFlow.replace(/,/g, '')) || q5Text.includes(absFlow), true);

  // ---- 6. Highest profit project ----
  console.log('\n=== Q6: highest profit project ===');
  const q6 = await ask(token, 'Which project has the highest profit?');
  console.log('intent:', q6.intent, '| message:', q6.message?.slice(0, 300));
  const exec = await getApi(token, '/analytics/executive');
  const topProj = [...exec.projects].sort((a, b) => b.profit - a.profit)[0];
  check('Q6 success', q6.success, true);
  check('Q6 mentions highest-profit project', (q6.message ?? '').includes(topProj.code) || (q6.message ?? '').includes(topProj.name) || JSON.stringify(q6.data ?? {}).includes(topProj.code), true);

  // ---- 7. Risk score question ----
  console.log('\n=== Q7: risk score ===');
  const q7 = await ask(token, 'What is the risk level of NCM-2026?', byCode['NCM-2026'].id);
  console.log('intent:', q7.intent, '| message:', q7.message?.slice(0, 300));
  check('Q7 success', q7.success, true);
  const ncmRisks = await getApi(token, `/analytics/project/${byCode['NCM-2026'].id}/risks`);
  const levelText = ncmRisks.score.level;
  check('Q7 mentions real risk level', (q7.message ?? '').toLowerCase().includes(levelText) || JSON.stringify(q7.data ?? {}).toLowerCase().includes(levelText), true);

  // ---- 8. Executive summary of a project ----
  console.log('\n=== Q8: project summary ===');
  const q8 = await ask(token, 'Give me a summary of project NCT-2026', byCode['NCT-2026'].id);
  console.log('intent:', q8.intent, '| message:', q8.message?.slice(0, 300));
  check('Q8 success', q8.success, true);
  check('Q8 mentions project code', (q8.message ?? '').includes('NCT-2026') || JSON.stringify(q8.data ?? {}).includes('NCT-2026'), true);

  console.log(`\n\n===== AI SUMMARY =====`);
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
