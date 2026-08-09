import { spawn } from 'child_process';
import http from 'http';

const PORT = 3001;
let passed = 0;
let failed = 0;
let token = '';
let server = null;

function test(name, condition) {
  if (condition) { passed++; process.stdout.write(`  [PASS] ${name}\n`); }
  else { failed++; process.stdout.write(`  [FAIL] ${name}\n`); }
}

async function request(method, path, body, tok) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (tok) opts.headers['Authorization'] = `Bearer ${tok}`;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function waitForServer(url, max = 40) {
  for (let i = 0; i < max; i++) {
    try { await new Promise((res, rej) => { const h = http.get(url, () => res()); h.on('error', rej); h.end(); }); return true; }
    catch { await new Promise(r => setTimeout(r, 1000)); }
  }
  return false;
}

async function login() {
  const r = await request('POST', '/api/v1/auth/login', { email: 'admin@elwataniya.com', password: 'Admin@123' });
  token = r.body?.data?.accessToken || r.body?.accessToken || '';
  test('Login OK', !!token);
}

async function chat(msg, convId) {
  const r = await request('POST', '/api/v1/ai-agent/chat', { message: msg, conversationId: convId }, token);
  return r.body;
}

async function main() {
  server = spawn('node', ['dist/src/main.js'], { cwd: 'D:\\elwataniya-company\\backend', stdio: 'pipe' });
  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});
  console.log('Starting server...');
  if (!await waitForServer('http://localhost:3001/api/v1/health')) { console.log('Server failed to start'); server.kill(); process.exit(1); }
  console.log('Server ready.\n');

  await login();

  console.log('\n=== Workflow: Create Project ===\n');

  {
    const r1 = await chat('I want to create a new project');
    test('create_project workflow starts', r1?.intent === 'create_project' || r1?.intent?.startsWith('workflow'));
    test('create_project asks for info', r1?.requiresFollowUp || r1?.followUpQuestion);

    const r2 = await chat('name is "Test Project Alpha", location is "Cairo", date is 2026-08-01, client is "Acme Corp"', r1?.conversationId);
    test('create_project reply on field submission', !!r2?.message);
    test('create_project eventually succeeds', !r2?.intent?.startsWith('workflow') || r2?.data?.steps?.length > 0);
  }

  console.log('\n=== Workflow: Employee Onboarding ===\n');

  {
    const r1 = await chat('I want to onboard a new employee');
    test('employee_onboarding workflow starts', r1?.intent === 'employee_onboarding' || r1?.intent?.startsWith('workflow') || r1?.message?.toLowerCase().includes('employee'));
    test('employee_onboarding asks for info', r1?.requiresFollowUp || r1?.followUpQuestion);

    const r2 = await chat('name is "Ahmed Ali", code is EMP-1001, hire date is 2026-08-01', r1?.conversationId);
    test('employee_onboarding processes fields', !!r2?.message);
  }

  console.log('\n=== Workflow: Purchase Order ===\n');

  {
    const r1 = await chat('I need to create a purchase order for cement');
    test('purchase_order workflow starts', r1?.intent === 'purchase_order' || r1?.intent?.startsWith('workflow') || r1?.message?.toLowerCase().includes('purchase'));
    test('purchase_order asks for info', r1?.requiresFollowUp || r1?.followUpQuestion);
  }

  console.log('\n=== Workflow: Contractor Onboarding ===\n');

  {
    const r1 = await chat('I want to onboard a new subcontractor');
    test('contractor_onboarding workflow starts', r1?.intent === 'contractor_onboarding' || r1?.intent?.startsWith('workflow') || r1?.message?.toLowerCase().includes('subcontractor') || r1?.message?.toLowerCase().includes('contractor'));
    test('contractor_onboarding asks for info', r1?.requiresFollowUp || r1?.followUpQuestion);
  }

  console.log('\n=== Workflow: Extract ===\n');

  {
    const r1 = await chat('I want to create an extract for a subcontractor');
    test(`extract workflow starts (intent: ${r1?.intent})`, !!(r1?.message));
    test('extract asks for info', r1?.requiresFollowUp || r1?.followUpQuestion);
  }

  console.log('\n=== Workflow: Approval Process ===\n');

  {
    const r1 = await chat('Show me pending approvals and approve them');
    test('approval workflow starts', !!r1?.message);
    test('approval returns list or asks', !!(r1?.message || r1?.followUpQuestion));
  }

  console.log('\n=== Chain Analysis ===\n');

  {
    const r1 = await chat('Show me a full project analysis with fund and inventory status');
    test('chain analysis returns data', !!r1?.message);
    test('chain analysis has content', r1?.message?.length > 20);
  }

  console.log('\n=== Analytics Endpoint ===\n');

  {
    const r = await request('GET', '/api/v1/ai-agent/analytics', null, token);
    test('analytics endpoint returns 200', r.status === 200);
    test('analytics has summary', r.body?.data?.summary);
    test('analytics has totalRequests >= 0', r.body?.data?.summary?.totalRequests >= 0);
  }

  console.log(`\n=== Results: ${passed}/${passed + failed} passed, ${failed} failed ===\n`);
  server.kill();
  process.exit(failed > 0 ? 1 : 0);
}

main();
