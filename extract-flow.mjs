import { writeFileSync } from 'fs';
const api = 'http://localhost:3001/api/v1';
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = login?.data?.accessToken;
const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const out = [];

const projs = (await fetch(`${api}/projects`, { headers: h }).then((r) => r.json()))?.data?.items || [];
const pid = projs[0]?.id;
const bid = (await fetch(`${api}/projects/${pid}/buildings`, { headers: h }).then((r) => r.json()))?.data?.buildings?.[0]?.id;
out.push('building: ' + bid);

const subs = (await fetch(`${api}/buildings/${bid}/subcontractors`, { headers: h }).then((r) => r.json()).catch(() => null));
const sArr = subs?.data?.items || subs?.items || subs?.data?.subcontractors || subs?.data || [];
const cid = sArr[0]?.subcontractor?.id || sArr[0]?.contractorId || sArr[0]?.id;
out.push('contractor: ' + cid);

if (!bid || !cid) { console.log(out.join('\n')); console.log('MISSING building/contractor'); process.exit(0); }

const mkItems = (current) => [{
  itemCode: 'QA-EX-01', description: 'QA extract test item', unit: 'm2',
  contractQuantity: 1000, previous: 0, current, executionPercent: Math.round((current / 1000) * 10000) / 100, unitPrice: 50,
}];

const meta = await fetch(`${api}/buildings/${bid}/contractors/${cid}/extracts?meta=1&status=running`, { headers: h });
out.push('extract meta: ' + meta.status + ' ' + JSON.stringify(await meta.json()).slice(0, 180));

const date = new Date().toISOString().slice(0, 10);
const created = await fetch(`${api}/buildings/${bid}/contractors/${cid}/extracts`, {
  method: 'POST', headers: h,
  body: JSON.stringify({ status: 'running', date, insurancePercent: 0, previousPaid: 0, items: mkItems(10) }),
});
const cj = await created.json();
const ex = cj?.extract || cj?.data?.extract;
out.push('create extract: ' + created.status + ' id=' + (ex?.id || ''));
out.push('create summary: ' + JSON.stringify({ totalContract: ex?.totalContract, totalExecuted: ex?.totalExecuted, totalCurrent: ex?.totalCurrent, netAmount: ex?.netAmount, worth: ex?.worth, status: ex?.status }));

if (ex?.id) {
  const detail = await fetch(`${api}/buildings/${bid}/contractors/${cid}/extracts/${ex.id}`, { headers: h }).then((r) => r.json());
  const d = detail?.extract || detail?.data?.extract;
  out.push('detail worth: ' + JSON.stringify({ status: d?.status, approved: d?.approved, netAmount: d?.net || d?.netAmount, runningNumber: d?.runningNumber }));

  const updated = await fetch(`${api}/buildings/${bid}/contractors/${cid}/extracts/${ex.id}`, {
    method: 'PUT', headers: h,
    body: JSON.stringify({ status: 'running', insurancePercent: 5, previousPaid: 0, date, items: mkItems(20), manualDeductions: [{ id: 'ded1', name: 'QA deduction', amount: 100, type: 'manual' }] }),
  });
  const uj = await updated.json();
  const uex = uj?.extract || uj?.data?.extract;
  out.push('update extract: ' + updated.status + ' currentItem=' + (uex?.items?.[0]?.current) + ' deductions=' + JSON.stringify(uex?.manualDeductions || uex?.deductions));

  const finalized = await fetch(`${api}/buildings/${bid}/contractors/${cid}/extracts/${ex.id}`, {
    method: 'PUT', headers: h,
    body: JSON.stringify({ status: 'final', insurancePercent: 5, previousPaid: 0, items: mkItems(20), manualDeductions: [{ id: 'ded1', name: 'QA deduction', amount: 100, type: 'manual' }] }),
  });
  const fj = await finalized.json();
  const fex = fj?.extract || fj?.data?.extract;
  out.push('finalize: ' + finalized.status + ' status=' + fex?.status);
}
console.log(out.join('\n'));