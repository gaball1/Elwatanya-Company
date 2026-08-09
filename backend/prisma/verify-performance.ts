import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:3001/api/v1';

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }),
  });
  const json = await res.json();
  return json.accessToken || json.data?.accessToken;
}

async function timeReq(token: string, path: string, method = 'GET', body?: any): Promise<number> {
  const t0 = performance.now();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  const ms = performance.now() - t0;
  if (!json.success && !Array.isArray(json.data)) {
    console.log(`  WARN ${path}: status ${res.status} ${json.message ?? ''}`);
  }
  return ms;
}

async function main() {
  const token = await login();
  if (!token) throw new Error('login failed');

  const projects = (await (await fetch(`${API}/analytics/projects`, { headers: { Authorization: `Bearer ${token}` } })).json()).data;
  const proj = projects as { id: string; code: string }[];

  // Find largest project by BOQ item count
  let largest = proj[0];
  let largestCount = 0;
  for (const p of proj) {
    const bids = (await prisma.building.findMany({ where: { projectId: p.id }, select: { id: true } })).map((b) => b.id);
    const emp = await prisma.employerBoqItem.count({ where: { buildingId: { in: bids } } });
    const cb = await prisma.contractorBoqItem.count({ where: { contractorBoq: { buildingId: { in: bids } } } });
    const total = emp + cb;
    if (total > largestCount) {
      largestCount = total;
      largest = p;
    }
  }
  console.log(`Largest project: ${largest.code} (${largestCount} BOQ items)`);

  console.log('\n=== Endpoint timings (ms) ===');
  const endpoints: [string, string][] = [
    ['projects list', '/analytics/projects'],
    ['executive dashboard', '/analytics/executive'],
  ];
  for (const p of proj) {
    endpoints.push([`dashboard (${p.code})`, `/analytics/project/${p.id}/dashboard`]);
  }

  for (const [label, path] of endpoints) {
    const cold = await timeReq(token, path);
    const warm = await timeReq(token, path);
    console.log(`  ${label.padEnd(28)} cold=${cold.toFixed(1)}ms  warm=${warm.toFixed(1)}ms`);
  }

  // Drilldown + report + AI timing on the largest project
  const lp = largest.id;
  console.log('\n=== Drilldown + exports + AI (largest project) ===');
  for (const kpi of ['progress', 'cost', 'revenue', 'profit']) {
    const t = await timeReq(token, `/analytics/project/${lp}/drilldown?kpi=${kpi}`);
    console.log(`  drilldown ${kpi.padEnd(8)} ${t.toFixed(1)}ms`);
  }

  const exportTypes: [string, string][] = [
    ['pdf', `/reporting/project_analytics/generate?format=pdf`],
    ['excel', `/reporting/project_analytics/generate?format=excel`],
    ['csv', `/reporting/project_analytics/generate?format=csv`],
  ];
  for (const [fmt, path] of exportTypes) {
    const t0 = performance.now();
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ projectId: lp }),
    });
    const buf = await res.arrayBuffer();
    const ms = performance.now() - t0;
    console.log(`  export ${fmt.padEnd(8)} ${ms.toFixed(1)}ms  size=${(buf.byteLength / 1024).toFixed(1)}KB status=${res.status} type=${res.headers.get('content-type')?.slice(0, 30)}`);
  }

  // AI agent response
  const t0 = performance.now();
  const aiRes = await fetch(`${API}/ai-agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message: 'What is the risk level of this project?', context: { projectId: lp } }),
  });
  await aiRes.json();
  console.log(`  ai-agent chat           ${(performance.now() - t0).toFixed(1)}ms`);

  // All-project aggregate (executive dashboard includes all dashboards)
  console.log('\n=== Executive dashboard detail ===');
  const t1 = performance.now();
  const execRes = await fetch(`${API}/analytics/executive`, { headers: { Authorization: `Bearer ${token}` } });
  const exec = await execRes.json();
  console.log(`  executive total ${(performance.now() - t1).toFixed(1)}ms  projects=${exec.data?.projects?.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
