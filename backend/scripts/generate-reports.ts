import * as fs from 'fs';
import * as path from 'path';

const BASE = process.env.API_BASE || 'http://localhost:3001/api/v1';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@elwataniya.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

const PROJECT_ID = '289481d1-d58b-478e-b76d-9cc364c98099';
const BUILDING_ID = '84a7d494-861b-45fb-bb46-dda36e84c3dd';
const CLIENT_STATEMENT_ID = 'fc7dac2e-fb95-441a-8e3f-e6b64311b49b';
const SUB_STATEMENT_ID = '61630bc5-f574-4576-aba3-ba1373c6527d';
const EXTRACT_STATEMENT_ID = '5e35813d-038f-48ee-a355-d3236fe7eabc';

let token = '';
let failures = 0;

function log(msg: string): void {
  console.log(msg);
}

async function request(method: string, pathname: string, opts: { body?: any } = {}): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let body: any;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${BASE}${pathname}`, { method, headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${pathname} -> ${res.status} ${text.slice(0, 400)}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const json = await res.json();
    return json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
  }
  return res.text();
}

async function generatePdf(name: string, params: any, outFile: string): Promise<void> {
  const res = await fetch(`${BASE}/document-engine/enterprise-templates/${name}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${name} -> ${res.status} ${text.slice(0, 300)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
  const docNumber = params.documentNumber || name.toUpperCase();
  console.log(`  ✓ ${name.padEnd(26)} ${buf.length.toString().padStart(7)} bytes -> ${path.basename(outFile)} (doc ${docNumber})`);
}

async function main() {
  const outDir = path.resolve(__dirname, 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  log('[1] Login');
  const login = await request('POST', '/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  token = login.accessToken;
  if (!token) throw new Error('Login failed');
  log(`  ✓ Logged in as ${login.user?.email}`);

  log('\n[2] Generate all enterprise-templates');
  const ts = Date.now();
  const defs: { name: string; params: any; filename: string }[] = [
    { name: 'employer_boq', params: { projectId: PROJECT_ID, buildingId: BUILDING_ID }, filename: 'employer_boq' },
    { name: 'analytical_boq', params: { projectId: PROJECT_ID, buildingId: BUILDING_ID }, filename: 'analytical_boq' },
    { name: 'final_boq', params: { projectId: PROJECT_ID }, filename: 'final_boq' },
    { name: 'contractor_boq', params: { projectId: PROJECT_ID, buildingId: BUILDING_ID }, filename: 'contractor_boq' },
    { name: 'contractor_extract', params: { projectId: PROJECT_ID, statementId: EXTRACT_STATEMENT_ID }, filename: 'contractor_extract' },
    { name: 'client_statement', params: { projectId: PROJECT_ID, statementId: CLIENT_STATEMENT_ID }, filename: 'client_statement' },
    { name: 'subcontractor_statement', params: { projectId: PROJECT_ID, statementId: SUB_STATEMENT_ID }, filename: 'subcontractor_statement' },
    { name: 'purchase_order', params: { projectId: PROJECT_ID }, filename: 'purchase_order' },
    { name: 'payment_voucher', params: { projectId: PROJECT_ID }, filename: 'payment_voucher' },
    { name: 'treasury_report', params: { projectId: PROJECT_ID }, filename: 'treasury_report' },
    { name: 'inventory_report', params: {}, filename: 'inventory_report' },
    { name: 'attendance_report', params: { projectId: PROJECT_ID, month: 7, year: 2026 }, filename: 'attendance_report' },
    { name: 'payroll_report', params: { projectId: PROJECT_ID }, filename: 'payroll_report' },
    { name: 'project_progress', params: { projectId: PROJECT_ID }, filename: 'project_progress' },
    { name: 'financial_report', params: { projectId: PROJECT_ID }, filename: 'financial_report' },
    { name: 'executive_report', params: { projectId: PROJECT_ID }, filename: 'executive_report' },
    { name: 'contractor_performance', params: { projectId: PROJECT_ID }, filename: 'contractor_performance' },
    { name: 'boq_analysis', params: { projectId: PROJECT_ID, buildingId: BUILDING_ID }, filename: 'boq_analysis' },
  ];

  const generated: { name: string; documentNumber: string; file: string }[] = [];
  for (const d of defs) {
    const docNumber = `${d.name.toUpperCase()}-NAC-${ts}`;
    const params = { ...d.params, documentNumber: docNumber, generatedBy: 'System' };
    try {
      const file = path.join(outDir, `${d.filename}.pdf`);
      await generatePdf(d.name, params, file);
      generated.push({ name: d.name, documentNumber: docNumber, file });
    } catch (e: any) {
      failures++;
      console.log(`  ✗ ${d.name}: ${e?.message?.slice(0, 200)}`);
    }
  }

  log('\n[3] Verify document hashes + verification page');
  for (const g of generated.slice(0, 4)) {
    try {
      const verify = await request('GET', `/verify/document/${g.documentNumber}/json`);
      const doc = verify.document || {};
      const hash = doc.verificationHash || '';
      const short = hash ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : '(none)';
      const status = verify.verificationStatus || '';
      console.log(`  ${g.name.padEnd(26)} status=${status} hash=${short}`);

      const pageRes = await fetch(`${BASE}/verify/document/${g.documentNumber}`);
      const html = await pageRes.text();
      const htmlFile = path.join(outDir, `${g.name}.verification.html`);
      fs.writeFileSync(htmlFile, html);
      const hasVerified = html.includes('Verified') || html.includes('valid');
      console.log(`  ${''.padEnd(26)} verification page ${pageRes.status} verified-badge=${hasVerified} -> ${path.basename(htmlFile)}`);
    } catch (e: any) {
      failures++;
      console.log(`  ✗ verify ${g.name}: ${e?.message?.slice(0, 150)}`);
    }
  }

  log(`\nGenerated ${generated.length}/${defs.length} documents. Failures: ${failures}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Report generation failed:', err);
  process.exit(1);
});
