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

  let r;
  r = await req('POST', '/api/v1/auth/login', {email:'admin@elwataniya.com',password:'Admin@123'});
  const token = r.b?.data?.accessToken || r.b?.accessToken;
  console.log('Login:', token ? 'OK' : 'FAIL');

  // Check user permissions
  const me = await req('GET', '/api/v1/auth/me', null, token);
  console.log('User permissions:', me.b?.permissions?.join(', ') || '(none)');

  const tests = [
    'Create a purchase order',
    'Create an extract',
    'I want to create a new project',
    'I want to onboard a new subcontractor',
    'Show me pending approvals',
    'Create an employee',
  ];

  for (const msg of tests) {
    r = await req('POST', '/api/v1/ai-agent/chat', { message: msg }, token);
    console.log(`\n  "${msg}"`);
    console.log(`    intent: ${r.b?.intent}`);
    console.log(`    requiresFollowUp: ${r.b?.requiresFollowUp}`);
    console.log(`    requiresWorkflow: ${r.b?.requiresWorkflow || r.b?.workflowName || '(none)'}`);
    console.log(`    message: ${(r.b?.message || '').substring(0, 120)}`);
    console.log(`    full keys: ${Object.keys(r.b || {}).join(', ')}`);
  }

  server.kill();
  process.exit(0);
}

main();
