const api = 'http://localhost:3001/api/v1';
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = login?.data?.accessToken;
const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const out = [];

const emps = (await fetch(`${api}/employees`, { headers: h }).then((r) => r.json()))?.data?.items || [];
const emp = emps[0];
out.push('employee for QA check: ' + (emp ? emp.id + ' ' + emp.name : 'NONE'));
if (!emp) { console.log(out.join('\n')); process.exit(0); }

const now = new Date();
const inRes = await fetch(`${api}/attendance/check-in`, {
  method: 'POST', headers: h,
  body: JSON.stringify({
    employeeId: emp.id,
    date: now.toISOString(),
    checkInTime: now.toISOString(),
    checkInLatitude: 30.0652,
    checkInLongitude: 32.6498,
    checkInAddress: 'Suez, Egypt',
    checkInAccuracy: 10,
    deviceInfo: 'QA Playwright',
    distanceFromSite: 0,
    notes: 'QA automated check-in',
  }),
});
const inJson = await inRes.json();
out.push('check-in: ' + inRes.status + ' rec=' + JSON.stringify(inJson).slice(0, 220));
const recId = inJson?.record?.id || inJson?.data?.record?.id;

if (recId) {
  const co = new Date(now.getTime() + 8 * 3600 * 1000);
  const outRes = await fetch(`${api}/attendance/${recId}/check-out`, {
    method: 'POST', headers: h,
    body: JSON.stringify({
      checkOutTime: co.toISOString(),
      checkOutLatitude: 30.0652,
      checkOutLongitude: 32.6498,
      checkOutAddress: 'Suez, Egypt',
      checkOutAccuracy: 10,
      distanceFromSite: 0,
      notes: 'QA automated check-out',
    }),
  });
  const outJson = await outRes.json();
  out.push('check-out: ' + outRes.status + ' ' + JSON.stringify(outJson).slice(0, 200));
  const rec = await fetch(`${api}/attendance/${recId}`, { headers: h }).then((r) => r.json());
  const r = rec?.record || rec?.data?.record;
  out.push('record after co: status=' + r?.status + ' hours=' + r?.hoursWorked + ' in=' + !!r?.checkIn + ' out=' + !!r?.checkOut);
} else {
  const override = inJson?.requiresApproval || inJson?.data?.requiresApproval;
  out.push('requires geo override approval: ' + override);
}

const dash = await fetch(`${api}/attendance/stats/dashboard`, { headers: h }).then((r) => r.json());
out.push('dashboard keys: ' + Object.keys(dash?.data || dash || {}).join(','));
const dayFloat = await fetch(`${api}/attendance?`, { headers: h });
const dayJson = await dayFloat.json();
const items = dayJson?.items || dayJson?.data?.items || [];
const today = now.toLocaleDateString('en-CA');
const recToday = items.filter((i) => (i?.date || '').slice(0, 10) === today || (i?.createdAt || '').slice(0, 10) === today).length;
out.push('list items today count: ' + recToday + ' total items: ' + items.length);
console.log(out.join('\n'));