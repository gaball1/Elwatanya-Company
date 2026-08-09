import http from 'http';
import { randomUUID } from 'crypto';

const BASE = 'http://localhost:3001';
let TOKEN = '';

function req(m, p, b, tok) {
  return new Promise(r => {
    const u = new URL(p, BASE);
    const h = http.request({ method: m, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: { 'Content-Type': 'application/json', ...(tok ? { 'Authorization': 'Bearer ' + tok } : {}) } }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { r({ s: res.statusCode, b: d ? JSON.parse(d) : null }); } catch { r({ s: res.statusCode, b: d }); } }); });
    h.on('error', e => r({ s: 0, b: e.message }));
    if (b) h.write(JSON.stringify(b));
    h.end();
  });
}

let score = 0;
let total = 0;

function check(name, pass, detail) {
  total++;
  if (pass) { score++; console.log(`  [PASS] ${name}${detail ? ' - ' + detail : ''}`); }
  else { console.log(`  [FAIL] ${name}${detail ? ' - ' + detail : ''}`); }
}

async function run() {
  console.log('========================================');
  console.log('  FINAL PRODUCTION READINESS AUDIT');
  console.log('========================================\n');

  // === 1. AUTHENTICATION (10 checks) ===
  console.log('--- 1. AUTHENTICATION ---');
  let r = await req('POST', '/api/v1/auth/login', { email: 'admin@elwataniya.com', password: 'Admin@123' });
  TOKEN = r.b?.data?.accessToken;
  check('Login with valid credentials', r.s === 200 || r.s === 201, `${r.s}`);

  r = await req('POST', '/api/v1/auth/login', { email: 'nonexistent@test.com', password: 'WrongPassword123' });
  check('Invalid credentials returns 401', r.s === 401, `${r.s}`);

  r = await req('GET', '/api/v1/projects');
  check('No token returns 401', r.s === 401, `${r.s}`);

  r = await req('GET', '/api/v1/projects', null, 'invalid-token');
  check('Invalid token returns 401', r.s === 401, `${r.s}`);

  r = await req('GET', '/api/v1/auth/me', null, TOKEN);
  check('Auth /me accessible', r.s === 200, `${r.s}`);

  r = await req('POST', '/api/v1/auth/refresh', { refreshToken: 'invalid-token-value' });
  check('Invalid refresh token returns 401', r.s === 401, `${r.s}`);

  r = await req('POST', '/api/v1/auth/logout', { refreshToken: 'some-valid-format-token' }, TOKEN);
  check('Logout endpoint accessible', r.s === 200 || r.s === 201, `${r.s}`);

  r = await req('POST', '/api/v1/auth/register', { email: `test${Date.now()}@test.com`, password: 'Test@123', name: 'Test' });
  check('Registration works', r.s === 201 || r.s === 200, `${r.s}`);

  r = await req('GET', '/api/v1/profile', null, TOKEN);
  check('Profile endpoint accessible', r.s === 200, `${r.s}`);

  r = await req('POST', '/api/v1/auth/forgot-password', { email: 'admin@elwataniya.com' });
  check('Forgot password accessible', r.s === 200 || r.s === 201, `${r.s}`);

  // === 2. RESPONSE STANDARDISATION (check all list endpoints) ===
  console.log('\n--- 2. RESPONSE STANDARDISATION ---');
  const listEndpoints = ['projects', 'clients', 'suppliers', 'subcontractors', 'employees', 'warehouses', 'categories', 'inventory-items', 'departments', 'holidays', 'leaves', 'shifts', 'notifications', 'approvals', 'audit', 'stock-movements', 'project-funds', 'fund-transactions', 'attendance'];
  for (const ep of listEndpoints) {
    r = await req('GET', `/api/v1/${ep}`, null, TOKEN);
    const hasSuccess = r.b?.success === true;
    const hasItems = r.b?.data?.items !== undefined || Array.isArray(r.b?.data);
    check(`List ${ep} returns standard format`, r.s === 200 && hasSuccess, `status=${r.s} keys=${Object.keys(r.b?.data||{}).join(',')}`);
  }

  // === 3. STATUS CODES (security) ===
  console.log('\n--- 3. STATUS CODES ---');
  r = await req('GET', '/api/v1/buildings/00000000-0000-0000-0000-000000000000', null, TOKEN);
  check('Not found returns 404', r.s === 404, `${r.s}`);

  r = await req('GET', '/api/v1/buildings/invalid-uuid', null, TOKEN);
  check('Invalid UUID returns 400', r.s === 400, `${r.s}`);

  // Try creating with existing holiday name/date
  r = await req('POST', '/api/v1/holidays', { name: 'Audit Holiday', date: '2026-12-25', description: 'Test', isRecurring: false }, TOKEN);
  if (r.s === 201 || r.s === 200) {
    // Create duplicate to trigger conflict
    r = await req('POST', '/api/v1/holidays', { name: 'Audit Holiday', date: '2026-12-25', description: 'Test', isRecurring: false }, TOKEN);
  }
  check('Duplicate returns 409', r.s === 409, `${r.s} (expected 409)`);

  // Try deleting non-existent entity
  r = await req('DELETE', '/api/v1/leaves/00000000-0000-0000-0000-000000000000', null, TOKEN);
  check('Delete non-existent returns 404', r.s === 404, `${r.s}`);

  // === 4. BUILDING CRUD ===
  console.log('\n--- 4. BUILDING CRUD ---');
  r = await req('GET', '/api/v1/projects', null, TOKEN);
  const pid = r.b?.data?.items?.[0]?.id || r.b?.data?.projects?.[0]?.id;
  if (pid) {
    r = await req('POST', `/api/v1/projects/${pid}/buildings`, { name: 'Audit Building', code: 'AUDIT' + Date.now(), type: 'RESIDENTIAL', startDate: '2026-07-30', latitude: 30.0444, longitude: 31.2357, allowedRadius: 100 }, TOKEN);
    const bid = r.b?.data?.building?.id || r.b?.data?.id;
    check('Create building with geofence', r.s === 201 && bid, `${r.s} id=${bid}`);

    if (bid) {
      r = await req('GET', `/api/v1/buildings/${bid}`, null, TOKEN);
      check('Get building with geofence', r.s === 200 && r.b?.data?.building?.latitude === 30.0444, `lat=${r.b?.data?.building?.latitude}`);

      r = await req('PATCH', `/api/v1/buildings/${bid}`, { name: 'Updated', latitude: 31.0000, longitude: 30.0000, allowedRadius: 200 }, TOKEN);
      check('Update building geofence', r.s === 200 && r.b?.data?.building?.latitude === 31.0000, `lat=${r.b?.data?.building?.latitude}`);

      r = await req('DELETE', `/api/v1/buildings/${bid}`, null, TOKEN);
      check('Soft-delete building', r.s === 200 || r.s === 204, `${r.s}`);
    }
  } else {
    check('Create building (no project found)', false, 'No project ID available');
  }

  // === 5. APPROVAL WORKFLOW ===
  console.log('\n--- 5. APPROVAL WORKFLOW ---');
  r = await req('POST', '/api/v1/approvals', { entityType: 'extract', entityId: randomUUID() }, TOKEN);
  const aid = r.b?.data?.approval?.id;
  check('Create approval', r.s === 201 && aid, `${r.s} id=${aid}`);

  if (aid) {
    r = await req('PATCH', `/api/v1/approvals/${aid}/approve`, { comment: 'Approved' }, TOKEN);
    check('Approve approval', r.s === 200, `${r.s}`);

    const aid2 = (await req('POST', '/api/v1/approvals', { entityType: 'purchase', entityId: randomUUID() }, TOKEN)).b?.data?.approval?.id;
    if (aid2) {
      r = await req('PATCH', `/api/v1/approvals/${aid2}/reject`, { comment: 'Rejected' }, TOKEN);
      check('Reject approval', r.s === 200, `${r.s}`);
    }
  }

  // === 6. PERMISSIONS & RBAC ===
  console.log('\n--- 6. PERMISSIONS & RBAC ---');
  r = await req('GET', '/api/v1/permissions', null, TOKEN);
  check('Permissions list accessible', r.s === 200, `${r.s}, count=${r.b?.data?.items?.length}`);

  r = await req('GET', '/api/v1/admin/roles', null, TOKEN);
  check('Admin roles accessible', r.s === 200, `${r.s}, count=${r.b?.data?.items?.length}`);

  r = await req('GET', '/api/v1/admin/users', null, TOKEN);
  check('Admin users accessible', r.s === 200, `${r.s}, count=${r.b?.data?.items?.length}`);

  // === SCORE ===
  const pct = Math.round((score / total) * 100);
  console.log(`\n========================================`);
  console.log(`  SCORE: ${score}/${total} = ${pct}%`);
  console.log(`  THRESHOLD: ≥95%`);
  console.log(`  STATUS: ${pct >= 95 ? '✅ PASS' : '❌ NEEDS WORK'}`);
  console.log(`========================================`);
}

run().catch(console.error);
