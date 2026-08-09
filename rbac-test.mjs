import { writeFileSync } from 'fs';

const api = 'http://localhost:3001/api/v1';
const adminLogin = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const adminToken = adminLogin?.data?.accessToken;
if (!adminToken) { console.log('ADMIN LOGIN FAILED'); process.exit(1); }

const H = (t) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });

const roleItems = (await fetch(`${api}/admin/roles`, { headers: H(adminToken) }).then((r) => r.json()))?.data?.items || [];
const permByRole = {};
for (const r of roleItems) permByRole[r.name] = new Set(r.permissions.map((p) => p.name));

let users = (await fetch(`${api}/admin/users`, { headers: H(adminToken) }).then((r) => r.json()))?.data?.items || [];

const proj = (await fetch(`${api}/projects`, { headers: H(adminToken) }).then((r) => r.json()))?.data?.items?.[0];
const buildingId = proj ? (await fetch(`${api}/projects/${proj.id}/buildings`, { headers: H(adminToken) }).then((r) => r.json()))?.data?.buildings?.[0]?.id : null;
const con = (await fetch(`${api}/contractors`, { headers: H(adminToken) }).then((r) => r.json()).catch(() => null));
const contractorId = con?.data?.items?.[0]?.id || null;
const SUB = buildingId || '00000000-0000-0000-0000-000000000000';
const SUB2 = contractorId || '11111111-1111-1111-1111-111111111111';
console.log('building:', SUB, 'contractor:', SUB2);

const targets = ['PROJECT_MANAGER', 'ACCOUNTANT', 'HR', 'CONTRACTOR', 'CLIENT'];
const PASS = 'Qa@123456';
for (const roleName of targets) {
  const role = roleItems.find((r) => r.name === roleName);
  if (!role) { console.log('MISSING ROLE', roleName); continue; }
  let user = users.find((u) => u.email === `qa_${roleName.toLowerCase()}@qa.local`);
  if (!user) {
    const created = await fetch(`${api}/admin/users`, { method: 'POST', headers: H(adminToken), body: JSON.stringify({ email: `qa_${roleName.toLowerCase()}@qa.local`, name: `QA ${roleName}`, password: PASS }) });
    const j = await created.json().catch(() => ({}));
    const cand = j?.user || j?.data?.user || j?.data;
    user = cand?.id ? cand : null;
    if (!user?.id) { console.log('CREATE FAILED for', roleName, created.status, JSON.stringify(j).slice(0, 160)); continue; }
  }
  const assign = await fetch(`${api}/admin/users/${user.id}/roles`, { method: 'POST', headers: H(adminToken), body: JSON.stringify({ roleIds: [role.id] }) });
  console.log(roleName, assign.status < 400 ? 'assigned' : 'assign FAIL ' + assign.status);
}

const probes = [
  { name: 'projects', url: `${api}/projects`, perm: 'projects.read' },
  { name: 'admin/users', url: `${api}/admin/users`, perm: 'users.read' },
  { name: 'attendance', url: `${api}/attendance`, perm: 'attendance.read' },
  { name: 'clients', url: `${api}/clients`, perm: 'clients.read' },
  { name: 'contractors', url: `${api}/subcontractors`, perm: 'subcontractors.read' },
  { name: 'employees', url: `${api}/employees`, perm: 'employees.read' },
  { name: 'payments', url: `${api}/buildings/${SUB}/contractors/${SUB2}/payments`, perm: 'payments.read' },
  { name: 'extracts', url: `${api}/buildings/${SUB}/contractors/${SUB2}/extracts`, perm: 'extracts.read' },
];

async function canLogin(email, password) {
  const r = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (r.status !== 201 && r.status !== 200) return { ok: false, status: r.status };
  const j = await r.json();
  return { ok: true, token: j?.data?.accessToken };
}

const results = [];
let allOk = true;

async function testRole(name, permName) {
  const email = name === 'SUPER_ADMIN' ? 'admin@elwataniya.com' : `qa_${name.toLowerCase()}@qa.local`;
  const pw = name === 'SUPER_ADMIN' ? 'Admin@123' : PASS;
  const lg = await canLogin(email, pw);
  if (!lg.ok) { results.push(`FAIL ${name}: login ${lg.status}`); allOk = false; return; }
  const expectedPerms = permByRole[name] || new Set();
  for (const ep of probes) {
    const r = await fetch(ep.url, { headers: H(lg.token) });
    const allowed = r.status < 400;
    const should = name === 'SUPER_ADMIN' || expectedPerms.has(ep.perm);
    const ok = allowed === should;
    if (!ok) { allOk = false; results.push(`FAIL ${name} ${ep.name}: got ${allowed ? 'ALLOW' : 'DENY'} (${r.status}) expected ${should ? 'ALLOW' : 'DENY'}`); }
    else results.push(`ok   ${name} ${ep.name}: ${allowed ? 'ALLOW' : 'DENY'} (${r.status}) expected ${should ? 'ALLOW' : 'DENY'}`);
  }
}

await testRole('SUPER_ADMIN');
for (const t of targets) await testRole(t, t);

console.log(results.join('\n'));
console.log(allOk ? 'ALL RBAC MATRIX CHECKS PASSED' : 'RBAC MATRIX FAILURES PRESENT');
writeFileSync('C:\\Users\\ABDELR~1\\AppData\\Local\\Temp\\opencode\\rbac-results.json', JSON.stringify(results, null, 1));