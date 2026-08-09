import { writeFileSync } from 'fs';

const api = 'http://localhost:3001/api/v1';
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = login?.data?.accessToken;
if (!token) { console.log('LOGIN FAILED'); process.exit(1); }
const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

const projects = await fetch(`${api}/projects`, { headers: h }).then((r) => r.json());
const proj = projects?.data?.items?.[0] || projects?.items?.[0];
console.log('project:', proj?.code, proj?.id);
const pid = proj?.id;

const buildRes = await fetch(`${api}/projects/${pid}/buildings`, { headers: h });
const buildings = buildRes.ok ? (await buildRes.json()) : null;
const bArr = buildings?.data?.items || buildings?.items || buildings?.data || [];
const bid = bArr[0]?.id;
console.log('building:', bid, bArr[0]?.name || '');

const cons = await fetch(`${api}/contractors`, { headers: h }).then((r) => r.json()).catch((e) => null);
const cArr = cons?.data?.items || cons?.items || [];
const cid = cArr[0]?.id;
console.log('contractor:', cid);

const tpl = await fetch(`${api}/document-engine/enterprise-templates`, { headers: h }).then((r) => r.json());
const templates = tpl?.data?.templates || tpl?.templates || [];
console.log('templates:', templates.map((t) => t.name).join(', '));

let ok = true;
const results = [];
for (const t of templates) {
  const params = {};
  if (t.requiresProject) params.projectId = pid;
  if (t.requiresBuilding) params.buildingId = bid;
  params.documentNumber = `${t.name.toUpperCase()}_QA_${Date.now()}`;
  if (['contractor_extract', 'contractor_boq', 'contractor_performance', 'subcontractor_statement', 'contractor-extract', 'contractor-boq', 'contractor-performance', 'subcontractor-statement'].includes(t.name) && cid) params.contractorId = cid;
  try {
    const r = await fetch(`${api}/document-engine/enterprise-templates/${t.name}/generate`, { method: 'POST', headers: h, body: JSON.stringify(params) });
    const buf = Buffer.from(await r.arrayBuffer());
    const magic = buf.subarray(0, 4).toString('latin1');
    const cd = r.headers.get('content-disposition') || '';
    const good = (r.status === 200 || r.status === 201) && magic === '%PDF' && buf.length > 1000;
    results.push(`${t.name}: ${r.status} bytes=${buf.length} magic=${magic} inline=${cd.includes('inline')} ${good ? 'OK' : 'FAIL'}`);
    if (!good) ok = false;
    if (good) writeFileSync(`C:\\Users\\ABDELR~1\\AppData\\Local\\Temp\\opencode\\${t.name}.pdf`, buf);
  } catch (e) {
    results.push(`${t.name}: ERROR ${e.message}`);
    ok = false;
  }
}
console.log(results.join('\n'));
console.log(ok ? 'ALL TEMPLATE PDFs OK' : 'SOME FAILED');