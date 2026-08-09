import { writeFileSync } from 'fs';

const api = 'http://localhost:3001/api/v1';
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = login?.data?.accessToken;
if (!token) { console.log('LOGIN FAILED'); process.exit(1); }
const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

const list = await fetch(`${api}/reporting/reports`, { headers: h }).then((r) => r.json());
const reports = list?.data ?? list?.reports ?? [];
console.log('reports:', reports.map((r) => r.name + (r.requiresProject ? ' (proj)' : '')));

let allOk = true;
for (const def of reports) {
  const params = def.requiresProject ? { projectId: '364b7530-87c9-44ac-afbe-df13feaa5382' } : {};
  for (const fmt of def.supportedFormats || ['pdf', 'excel', 'csv']) {
    const r = await fetch(`${api}/reporting/${def.name}/generate?format=${fmt}`, { method: 'POST', headers: h, body: JSON.stringify(params) });
    const buf = Buffer.from(await r.arrayBuffer());
    const cd = r.headers.get('content-disposition') || '';
    const magic = fmt === 'pdf' ? buf.subarray(0, 4).toString('latin1') : buf.subarray(0, 3).toString('latin1');
    console.log(`${def.name} ${fmt}: ${r.status} bytes=${buf.length} head=${JSON.stringify(magic)} cd=${cd.slice(0, 60)}`);
    if (r.status !== 200 || buf.length === 0) { allOk = false; console.log('   !! FAIL'); }
    writeFileSync(`C:\\Users\\ABDELR~1\\AppData\\Local\\Temp\\opencode\\${def.name}.${fmt}`, buf);
  }
  const prev = await fetch(`${api}/reporting/${def.name}/preview?${new URLSearchParams(params)}`, { headers: h });
  const pjson = await prev.json();
  const html = pjson?.data?.html || pjson?.html || '';
  const isHtml = html.trim().startsWith('<') || html.includes('<table>') || html.includes('<h2>');
  const hasPdfGarbage = html.includes('%PDF');
  console.log(`${def.name} preview: ${prev.status} len=${html.length} isHtml=${isHtml} pdfGarbage=${hasPdfGarbage}`);
  if (!isHtml || hasPdfGarbage) { allOk = false; console.log('   !! FAIL'); }
}

const emptyCsv = await fetch(`${api}/reporting/project_dashboard/generate?format=csv`, { method: 'POST', headers: h, body: JSON.stringify({}) });
const eb = Buffer.from(await emptyCsv.arrayBuffer());
console.log('empty-project dashboard csv: status=' + emptyCsv.status + ' bytes=' + eb.length + ' preview=' + JSON.stringify(eb.toString('utf-8').slice(0, 40)));

console.log(allOk ? 'ALL OK' : 'SOME FAILURES');
