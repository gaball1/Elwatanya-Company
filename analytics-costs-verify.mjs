const BASE = 'http://localhost:3001/api/v1';

async function api(path, token, method = 'GET', body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: res.status, json };
}

function fmt(n) {
  return typeof n === 'number' ? n.toFixed(2) : String(n);
}

{
  const login = await api('/auth/login', null, 'POST', { email: 'admin@elwataniya.com', password: 'Admin@123' });
  if (login.status !== 201 && login.status !== 200) { console.log('LOGIN FAILED', login.status); process.exit(1); }
  const token = login.json.data.accessToken;

  const projs = await api('/analytics/projects', token);
  const projects = projs.json.data ?? projs.json;
  console.log(`checking ${projects.length} projects`);

  const suspects = [];
  for (const p of projects) {
    const costs = await api(`/analytics/project/${p.id}/costs`, token);
    const boq = await api(`/analytics/project/${p.id}/boq`, token);
    const c = costs.json.data ?? costs.json;
    const b = boq.json.data ?? boq.json;
    const items = b.items ?? [];
    const itemCount = items.length;
    const sumValue = items.reduce((a, i) => a + Math.abs(i.employerValue ?? 0) + Math.abs(i.contractorValue ?? 0), 0);
    const zeroTotals = Math.abs(c.totals?.employerValue ?? 0) === 0 && Math.abs(c.totals?.profit ?? 0) === 0;
    const zeroCostButItemValues = zeroTotals && itemCount > 0 && sumValue > 0;
    const boqSumProfit = items.reduce((a, i) => a + (i.profit ?? 0), 0);
    const profitMismatch = Math.abs(boqSumProfit) > 0 && Math.abs((c.totals?.profit ?? 0) - boqSumProfit) > 0.01;
    if (zeroCostButItemValues) {
      suspects.push({ project: p.code, issue: 'ZERO_TOTALS_WITH_ITEMS', totals: c.totals, itemCount });
    }
    if (profitMismatch) {
      suspects.push({ project: p.code, issue: 'PROFIT_MISMATCH', costProfit: c.totals?.profit, boqSum: boqSumProfit });
    }
    console.log(`${String(p.code).padEnd(24)} items=${itemCount} emp=${fmt(c.totals?.employerValue)} cont=${fmt(c.totals?.contractorValue)} profit=${fmt(c.totals?.profit)} topProfit=${(b.topProfit ?? []).length}`);
  }
  if (suspects.length === 0) {
    console.log('\nNO SUSPECTS FOUND - costs totals match boq items for all projects');
  } else {
    console.log('\nSUSPECTS:');
    console.log(JSON.stringify(suspects, null, 2));
  }
}