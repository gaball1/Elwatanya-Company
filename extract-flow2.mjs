const api = 'http://localhost:3001/api/v1';
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = login?.data?.accessToken;
const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const out = [];

const projs = (await fetch(`${api}/projects`, { headers: h }).then((r) => r.json()))?.data?.items || [];
const pid = projs[0]?.id;
const bid = (await fetch(`${api}/projects/${pid}/buildings`, { headers: h }).then((r) => r.json()))?.data?.buildings?.[0]?.id;
const subs = (await fetch(`${api}/buildings/${bid}/subcontractors`, { headers: h }).then((r) => r.json()));
const sArr = subs?.data?.items || subs?.items || [];
const target = sArr[0];
const cid = target?.subcontractor?.id;
out.push('building: ' + bid + ' contractor: ' + cid + ' wtype=' + target?.workType);

const boq = await fetch(`${api}/buildings/${bid}/contractors/${cid}/boq`, { headers: h });
const bj = await boq.json();
out.push('boq status: ' + boq.status);
const bq = bj?.items || bj?.data?.items || bj?.boq || bj?.data?.boq || [];
const arr = Array.isArray(bq) ? bq : (bq?.items || []);
out.push('boq items count: ' + arr.length);
if (!arr.length) { console.log(out.join('\n')); console.log('BOQ EMPTY'); process.exit(0); }

const first = arr[0];
const contractQuantity = Number(first.quantity) || Number(first.contractQuantity) || 8;
const currentCreate = Math.max(1, Math.floor(contractQuantity / 2));
const item = {
  itemCode: first.itemCode,
  description: first.description || first.itemCode,
  unit: first.unit || 'م²',
  contractQuantity,
  previous: Number(first.previousQuantity) || 0,
  current: currentCreate,
  executionPercent: Math.round((currentCreate / contractQuantity) * 10000) / 100,
  unitPrice: Number(first.unitPrice) || 50,
};
out.push('sampled boq item: ' + JSON.stringify({ code: first.itemCode, qty: item.contractQuantity, price: item.unitPrice }));

const meta = await fetch(`${api}/buildings/${bid}/contractors/${cid}/extracts?meta=1&status=running`, { headers: h }).then((r) => r.json());
const metaData = meta?.data || meta;
out.push('meta: previousPaid=' + metaData?.previousPaid + ' nextRunning=' + metaData?.nextRunning);

const date = new Date().toISOString().slice(0, 10);
const create = await fetch(`${api}/buildings/${bid}/contractors/${cid}/extracts`, {
  method: 'POST', headers: h,
  body: JSON.stringify({ status: 'running', date, insurancePercent: 0, previousPaid: metaData?.previousPaid ?? 0, items: [item] }),
});
const cj = await create.json();
out.push('create: ' + create.status);
if (create.status >= 400) { out.push('create err: ' + JSON.stringify(cj).slice(0, 400)); }
else {
  const ex = cj?.extract || cj?.data?.extract;
  out.push('extract: ' + JSON.stringify({ id: ex?.id, status: ex?.status, totalContract: ex?.totalContract, totalExecuted: ex?.totalExecuted, totalCurrent: ex?.totalCurrent, netAmount: ex?.netAmount, manualNet: ex?.manualDeductions?.length }));
  if (ex?.id) {
    const upd = await fetch(`${api}/buildings/${bid}/contractors/${cid}/extracts/${ex.id}`, {
      method: 'PUT', headers: h,
      body: JSON.stringify({ status: 'running', insurancePercent: 0, previousPaid: metaData?.previousPaid ?? 0, date, items: [{ ...item, current: contractQuantity, executionPercent: 100 }], manualDeductions: [{ id: 'd1', name: 'QA deduction', amount: 100, type: 'manual' }] }),
    });
    const uj = await upd.json();
    const uex = uj?.extract || uj?.data?.extract;
    out.push('update: ' + upd.status + ' current=' + (uex?.items?.[0]?.current) + ' net=' + uex?.netAmount + ' hasDeductions=' + (uex?.manualDeductions?.length || uex?.deductions?.length || 0));
    if (upd.status < 400) {
      const fin = await fetch(`${api}/buildings/${bid}/contractors/${cid}/extracts/${ex.id}`, {
        method: 'PUT', headers: h,
        body: JSON.stringify({ status: 'final', insurancePercent: 0, previousPaid: metaData?.previousPaid ?? 0, date, items: [{ ...item, current: contractQuantity, executionPercent: 100 }], manualDeductions: [{ id: 'd1', name: 'QA deduction', amount: 100, type: 'manual' }] }),
      });
      const fj = await fin.json();
      const fex = fj?.extract || fj?.data?.extract;
      out.push('finalize: ' + fin.status + ' status=' + fex?.status);
    }
  }
}
console.log(out.join('\n'));