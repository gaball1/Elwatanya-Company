import { spawn } from 'child_process';
import http from 'http';

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
function fail(m, d) { console.log('  [FAIL] ' + m + (d ? ' - ' + JSON.stringify(d).slice(0,300) : '')); }

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
  if (!await waitForServer('http://localhost:3001/api/v1/health')) { console.log('Server failed to start'); process.exit(1); }
  console.log('Server ready.\n');

  let r, token;
  r = await req('POST', '/api/v1/auth/login', {email:'admin@elwataniya.com',password:'Admin@123'});
  token = r.b?.data?.accessToken || r.b?.accessToken;
  if (!token) { fail('Login - could not get token', r.b); server.kill(); process.exit(1); }
  pass('Login OK');

  let total = 0, passed = 0, failed = 0;
  function test(name, fn) {
    total++;
    try {
      if (fn()) { passed++; pass(name); } else { failed++; fail(name); }
    } catch(e) { failed++; fail(name, e.message); }
  }

  // =====================
  // Level 1: Knowledge Queries
  // =====================
  console.log('\n=== Level 1: Knowledge Queries ===');

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Explain how BOQ works' }, token);
  test('explain_boq - returns 200', () => r.s === 200);
  test('explain_boq - has message', () => !!r.b?.message);
  test('explain_boq - intent is explain_boq', () => r.b?.intent === 'explain_boq');
  test('explain_boq - has conversationId', () => !!r.b?.conversationId);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'What is project fund?' }, token);
  test('explain_fund - returns 200', () => r.s === 200);
  test('explain_fund - intent contains explain', () => r.b?.intent && r.b.intent.startsWith('explain'));

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Tell me about attendance tracking' }, token);
  test('explain_attendance - returns 200', () => r.s === 200);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'How do approvals work?' }, token);
  test('explain_approval - returns 200', () => r.s === 200);

  // =====================
  // Level 2: Data Retrieval
  // =====================
  console.log('\n=== Level 2: Data Retrieval ===');

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Show me projects' }, token);
  test('list_projects - returns 200', () => r.s === 200);
  test('list_projects - intent is list_projects', () => r.b?.intent === 'list_projects');
  test('list_projects - has data', () => r.b?.data !== undefined);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'List employees' }, token);
  test('list_employees - returns 200', () => r.s === 200);
  test('list_employees - intent is list_employees', () => r.b?.intent === 'list_employees');

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Show pending approvals' }, token);
  test('list_approvals - returns 200', () => r.s === 200);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'List subcontractors' }, token);
  test('list_subcontractors - returns 200', () => r.s === 200);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Show me suppliers' }, token);
  test('list_suppliers - returns 200', () => r.s === 200);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'List buildings' }, token);
  test('list_buildings - returns 200', () => r.s === 200);

  // =====================
  // Level 3: Execute Operations
  // =====================
  console.log('\n=== Level 3: Execute Operations ===');

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Create a project' }, token);
  test('create_project - returns 200', () => r.s === 200);
  test('create_project - asks for follow-up info', () => r.b?.requiresFollowUp === true);
  test('create_project - has followUpQuestion', () => !!r.b?.followUpQuestion);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Create an employee' }, token);
  test('create_employee - returns 200', () => r.s === 200);
  test('create_employee - asks for follow-up info', () => r.b?.requiresFollowUp === true);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Create a purchase order' }, token);
  test('create_purchase - returns 200', () => r.s === 200);
  test('create_purchase - asks for follow-up info', () => r.b?.requiresFollowUp === true);

  // =====================
  // Level 4: Conversation context
  // =====================
  console.log('\n=== Level 4: Conversation Context ===');

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Show me projects' }, token);
  const convId = r.b?.conversationId;
  test('context - gets conversationId', () => !!convId);

  if (convId) {
    r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Show me projects', conversationId: convId }, token);
    test('context - same conversationId returns same', () => r.b?.conversationId === convId);
  }

  // =====================
  // Level 5: Unknown query handling
  // =====================
  console.log('\n=== Level 5: Edge Cases ===');

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'xylophone zebra quantum' }, token);
  test('unknown - returns 200', () => r.s === 200);
  test('unknown - intent is unknown', () => r.b?.intent === 'unknown');
  test('unknown - has helpful message', () => !!r.b?.message && r.b.message.length > 10);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: '' }, token);
  test('empty - still returns 200', () => r.s === 200);

  // =====================
  // Level 6: Business Analysis (new)
  // =====================
  console.log('\n=== Level 6: Business Analysis ===');

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Summary of projects' }, token);
  test('project_summary - returns 200', () => r.s === 200);
  test('project_summary - has counts', () => r.b?.data?.total !== undefined);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Show employee stats' }, token);
  test('employee_stats - returns 200', () => r.s === 200);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Show inventory summary' }, token);
  test('inventory_summary - returns 200', () => r.s === 200);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Show fund summary' }, token);
  test('fund_summary - returns 200', () => r.s === 200);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Show approval summary' }, token);
  test('pending_approvals_summary - returns 200', () => r.s === 200);

  // =====================
  // Level 7: Get Details (new)
  // =====================
  console.log('\n=== Level 7: Get Details ===');

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Get details for employee' }, token);
  test('get_employee - returns 200', () => r.s === 200);
  test('get_employee - says employee ID required', () => r.b?.message?.toLowerCase().includes("employee") && r.b?.message?.includes("ID"));

  // =====================
  // Level 8: Update Operations (new)
  // =====================
  console.log('\n=== Level 8: Update Operations ===');

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Update project' }, token);
  test('update_project - returns 200', () => r.s === 200);
  test('update_project - asks for follow-up info', () => r.b?.requiresFollowUp === true);

  r = await req('POST', '/api/v1/ai-agent/chat', { message: 'Update employee' }, token);
  test('update_employee - returns 200', () => r.s === 200);
  test('update_employee - asks for follow-up info', () => r.b?.requiresFollowUp === true);

  // =====================
  // Topics endpoint
  // =====================
  console.log('\n=== Topics Endpoint ===');

  r = await req('GET', '/api/v1/ai-agent/topics', null, token);
  const topics = r.b?.data?.topics || r.b?.topics;
  test('topics - returns 200', () => r.s === 200);
  test('topics - has topics array', () => Array.isArray(topics));
  test('topics - contains boq', () => topics?.includes('boq'));

  // =====================
  // Summary
  // =====================
  console.log(`\n=== Results: ${passed}/${total} passed, ${failed} failed ===`);
  server.kill();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
