import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:3001/api/v1';
const num = (v: any): number => (typeof v === 'number' ? v : Number(v ?? 0));

let pass = 0;
let fail = 0;

function check(label: string, actual: any, expected: any, tol = 0.5) {
  const ok = typeof actual === 'number' && typeof expected === 'number'
    ? Math.abs(actual - expected) <= tol
    : String(actual) === String(expected);
  if (ok) pass++;
  else {
    fail++;
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

function extractNumbers(text: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^,]+),([^,]+)$/);
    if (m) {
      const key = m[1].trim();
      const val = parseFloat(m[2].replace(/,/g, ''));
      if (!isNaN(val)) map.set(key, val);
    }
  }
  return map;
}

async function main() {
  const token = await login();
  if (!token) throw new Error('login failed');
  const projects = (await (await fetch(`${API}/analytics/projects`, { headers: { Authorization: `Bearer ${token}` } })).json()).data;

  for (const p of projects as { id: string; code: string }[]) {
    console.log(`\n=== Export check ${p.code} ===`);
    const dash = (await (await fetch(`${API}/analytics/project/${p.id}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })).json()).data;

    const res = await fetch(`${API}/reporting/project_analytics/generate?format=csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ projectId: p.id }),
    });
    const csvText = await res.text();
    const nums = extractNumbers(csvText);

    // Summary values (2-column lines: key,value)
    check(`${p.code} CSV Revenue`, nums.get('Revenue'), dash.cost.employerValue);
    check(`${p.code} CSV Cost`, nums.get('Cost'), dash.cost.actualCost);
    check(`${p.code} CSV Profit`, nums.get('Profit'), dash.cost.profit);
    check(`${p.code} CSV Margin`, nums.get('Margin %'), dash.cost.margin);
    check(`${p.code} CSV EV`, nums.get('Earned Value'), dash.evm.ev);
    check(`${p.code} CSV CPI`, nums.get('CPI'), dash.evm.cpi);
    check(`${p.code} CSV SPI`, nums.get('SPI'), dash.evm.spi);
    check(`${p.code} CSV EAC`, nums.get('EAC'), dash.evm.eac);
    check(`${p.code} CSV CashBalance`, nums.get('Cash Balance'), dash.treasury.balance);
    check(`${p.code} CSV RiskScore`, nums.get('Risk Score'), dash.risks.score.overall);

    // Row counts: header + KPI rows + BOQ rows + contractor rows + risk rows + blank + summary marker + 13 summary lines
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const summaryKeys = 13; // Project, Status, Progress, EV, CPI, SPI, EAC, Revenue, Cost, Profit, Margin, CashBalance, RiskScore
    const expectedRows =
      Object.keys(dash.kpis).length +
      dash.boq.items.length +
      dash.contractors.length +
      dash.risks.items.length +
      1 + // header
      1 + // summary marker
      summaryKeys;
    check(`${p.code} CSV row count`, lines.length, expectedRows);

    // Excel export has matching filename/mime
    const xl = await fetch(`${API}/reporting/project_analytics/generate?format=excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ projectId: p.id }),
    });
    check(`${p.code} Excel status`, xl.status, 201);
    check(`${p.code} Excel mime`, xl.headers.get('content-type')?.includes('excel') || xl.headers.get('content-type')?.includes('spreadsheet'), true);

    const pdf = await fetch(`${API}/reporting/project_analytics/generate?format=pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ projectId: p.id }),
    });
    check(`${p.code} PDF status`, pdf.status, 201);
    check(`${p.code} PDF mime`, pdf.headers.get('content-type')?.includes('pdf'), true);
  }

  console.log(`\n===== EXPORT SUMMARY =====`);
  console.log(`PASS: ${pass}  FAIL: ${fail}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
