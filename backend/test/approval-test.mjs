import { spawn } from 'child_process';
import http from 'http';
import { randomUUID } from 'crypto';

function req(m, p, b, token) {
  return new Promise(r => {
    const u = new URL(p, 'http://localhost:3001');
    const h = http.request({method:m,hostname:u.hostname,port:u.port,path:u.pathname+u.search,headers:{'Content-Type':'application/json', ...(token ? {'Authorization':'Bearer '+token}: {})}}, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try { r({s:res.statusCode,b:d?JSON.parse(d):null}); } catch { r({s:res.statusCode,b:d}); } });
    });
    h.on('error',e=>r({s:0,b:e.message})); if(b) h.write(JSON.stringify(b)); h.end();
  });
}

function pass(m) { console.log('  [PASS] ' + m); }
function fail(m, d) { console.log('  [FAIL] ' + m + (d ? ' - ' + JSON.stringify(d).slice(0,200) : '')); }

async function waitForServer(url, max = 40) {
  for (let i = 0; i < max; i++) {
    try { await new Promise((res, rej) => { const h = http.get(url, () => res()); h.on('error', rej); h.end(); }); return true; } catch { await new Promise(r => setTimeout(r, 1000)); }
  }
  return false;
}

async function main() {
  const server = spawn('node', ['dist/src/main.js'], { cwd: 'D:\\elwataniya-company\\backend', stdio: 'pipe' });
  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});
  console.log('Starting server...');
  if (!await waitForServer('http://localhost:3001/api/v1/health')) { console.log('Server failed'); process.exit(1); }
  console.log('Server ready.\n');

  let r, token;
  r = await req('POST', '/api/v1/auth/login', {email:'admin@elwataniya.com',password:'Admin@123'});
  token = r.b?.data?.accessToken;
  if (!token) { fail('Login'); server.kill(); process.exit(1); }
  pass('Login OK');

  const entities = ['extract', 'purchase', 'leave', 'fund-transaction', 'client-statement', 'subcontractor-statement', 'inventory'];
  const uuid = randomUUID();

  for (const et of entities) {
    console.log('\n--- Testing: ' + et + ' ---');
    // Create approval
    r = await req('POST', '/api/v1/approvals', { entityType: et, entityId: uuid }, token);
    const id = r.b?.data?.approval?.id || r.b?.data?.id || r.b?.approval?.id;
    if (r.s >= 400) { fail('Create ' + et, r.b); continue; }
    pass('Created ' + et + ' approval - ID: ' + id);

    // Get
    r = await req('GET', '/api/v1/approvals/' + id, null, token);
    if (r.s >= 400) { fail('Get ' + et, r.b); } else { pass('Get ' + et); }

    // Approve
    r = await req('PATCH', '/api/v1/approvals/' + id + '/approve', { comment: 'Approved' }, token);
    if (r.s >= 400) { fail('Approve ' + et, r.b); } else { pass('Approved ' + et); }

    // Create another for reject test
    const uuid2 = randomUUID();
    r = await req('POST', '/api/v1/approvals', { entityType: et, entityId: uuid2 }, token);
    const id2 = r.b?.data?.approval?.id || r.b?.data?.id || r.b?.approval?.id;
    if (id2) {
      r = await req('PATCH', '/api/v1/approvals/' + id2 + '/reject', { comment: 'Rejected' }, token);
      if (r.s >= 400) { fail('Reject ' + et, r.b); } else { pass('Rejected ' + et); }
    }
  }

  // Draft lifecycle: create draft -> cancel
  console.log('\n--- Draft Lifecycle (inventory) ---');
  const draftUuid = randomUUID();
  r = await req('POST', '/api/v1/approvals', { entityType: 'inventory', entityId: draftUuid, status: 'draft' }, token);
  const draftId = r.b?.data?.approval?.id || r.b?.data?.id || r.b?.approval?.id;
  if (r.s >= 400 || !draftId) { fail('Create draft', r.b); } else {
    pass('Created draft - ID: ' + draftId);
    r = await req('GET', '/api/v1/approvals/' + draftId, null, token);
    const draftStatus = r.b?.data?.approval?.status || r.b?.data?.status;
    if (draftStatus === 'draft') { pass('Draft status is draft'); } else { fail('Draft status', r.b); }

    // Submit draft -> pending
    r = await req('PATCH', '/api/v1/approvals/' + draftId + '/submit', { comment: 'Ready' }, token);
    if (r.s >= 400) { fail('Submit draft', r.b); } else {
      const subStatus = r.b?.data?.approval?.status || r.b?.data?.status;
      if (subStatus === 'pending') { pass('Draft submitted -> pending'); } else { fail('Submit draft status', r.b); }
      // Cancel pending
      r = await req('PATCH', '/api/v1/approvals/' + draftId + '/cancel', { comment: 'No longer needed' }, token);
      const canStatus = r.b?.data?.approval?.status || r.b?.data?.status;
      if (r.s >= 400) { fail('Cancel pending', r.b); } else if (canStatus === 'cancelled') { pass('Pending cancelled'); } else { fail('Cancel pending status', r.b); }
    }
  }

  // Draft cancel directly
  console.log('\n--- Draft Cancel ---');
  const draftUuid2 = randomUUID();
  r = await req('POST', '/api/v1/approvals', { entityType: 'inventory', entityId: draftUuid2, status: 'draft' }, token);
  const draftId2 = r.b?.data?.approval?.id || r.b?.data?.id || r.b?.approval?.id;
  if (draftId2) {
    r = await req('PATCH', '/api/v1/approvals/' + draftId2 + '/cancel', {}, token);
    const can2 = r.b?.data?.approval?.status || r.b?.data?.status;
    if (r.s >= 400) { fail('Cancel draft', r.b); } else if (can2 === 'cancelled') { pass('Draft cancelled'); } else { fail('Cancel draft status', r.b); }
  }

  // Re-request after reject: engine should allow (rejected/cancelled can be re-requested)
  console.log('\n--- Re-request after reject ---');
  const rejectUuid = randomUUID();
  r = await req('POST', '/api/v1/approvals', { entityType: 'inventory', entityId: rejectUuid }, token);
  const rejectId = r.b?.data?.approval?.id || r.b?.data?.id || r.b?.approval?.id;
  if (rejectId) {
    await req('PATCH', '/api/v1/approvals/' + rejectId + '/reject', { comment: 'Rejected' }, token);
    r = await req('POST', '/api/v1/approvals', { entityType: 'inventory', entityId: rejectUuid }, token);
    const reId = r.b?.data?.approval?.id || r.b?.data?.id || r.b?.approval?.id;
    if (r.s >= 400) { fail('Re-request after reject', r.b); } else { pass('Re-request after reject OK - ID: ' + reId); }
  }

  // List all
  console.log('\n--- List All ---');
  r = await req('GET', '/api/v1/approvals', null, token);
  const items = r.b?.data?.items || r.b?.items || [];
  pass('List approvals: ' + items.length + ' total');

  server.kill();
}

main().catch(e => { console.error(e); process.exit(1); });
