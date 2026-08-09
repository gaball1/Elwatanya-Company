import http from 'http';

const BASE = 'http://localhost:3001';
let TOKEN = '';

function req(method, path, body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };
    if (TOKEN) opts.headers['Authorization'] = `Bearer ${TOKEN}`;
    const h = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    h.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (body) h.write(JSON.stringify(body));
    h.end();
  });
}

async function run() {
  const r = await req('POST', '/api/v1/auth/login', { email: 'admin@elwataniya.com', password: 'Admin@123' });
  TOKEN = r.body?.data?.accessToken || '';
  console.log('Token:', TOKEN ? 'OK' : 'FAIL');

  // Test project create with detailed error
  const projectBody = {
    code: 'P' + Date.now(),
    name: 'Test Project',
    location: 'Cairo',
    description: 'Production validation',
    startDate: '2026-07-30',
    status: 'ACTIVE',
  };
  console.log('\n--- CREATE PROJECT ---');
  console.log('Body:', JSON.stringify(projectBody));
  let res = await req('POST', '/api/v1/projects', projectBody);
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.body, null, 2).slice(0, 500));

  // Test create client
  console.log('\n--- CREATE CLIENT ---');
  res = await req('POST', '/api/v1/clients', { name: 'Test Client', email: 'client@test.com', phone: '01000000000', status: 'ACTIVE' });
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.body, null, 2).slice(0, 500));

  // Test create supplier
  console.log('\n--- CREATE SUPPLIER ---');
  res = await req('POST', '/api/v1/suppliers', { name: 'Test Supplier', email: 'supplier@test.com', phone: '01000000001', status: 'ACTIVE' });
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.body, null, 2).slice(0, 500));

  // Test create subcontractor
  console.log('\n--- CREATE SUBCONTRACTOR ---');
  res = await req('POST', '/api/v1/subcontractors', { name: 'Test Sub', workType: 'ELECTRICAL', phone: '01000000002', status: 'ACTIVE' });
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.body, null, 2).slice(0, 500));

  // Test create warehouse
  console.log('\n--- CREATE WAREHOUSE ---');
  res = await req('POST', '/api/v1/warehouses', { code: 'WH1', name: 'Main WH', location: 'Cairo', status: 'ACTIVE' });
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.body, null, 2).slice(0, 500));

  // Test create category
  console.log('\n--- CREATE CATEGORY ---');
  res = await req('POST', '/api/v1/categories', { code: 'CAT1', name: 'Materials', status: 'ACTIVE' });
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.body, null, 2).slice(0, 500));

  // Test create department
  console.log('\n--- CREATE DEPARTMENT ---');
  res = await req('POST', '/api/v1/departments', { code: 'DEPT1', name: 'Engineering', status: 'ACTIVE' });
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.body, null, 2).slice(0, 500));

  // Test create employee
  console.log('\n--- CREATE EMPLOYEE ---');
  res = await req('POST', '/api/v1/employees', { code: 'EMP1', fullName: 'Test Emp', nationalId: '12345678901234', phone: '01000000003', email: 'emp@test.com', hireDate: '2026-01-01', salary: 5000, status: 'ACTIVE' });
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.body, null, 2).slice(0, 500));

  // Test list admin users
  console.log('\n--- LIST ADMIN USERS ---');
  res = await req('GET', '/api/v1/admin/users');
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.body, null, 2).slice(0, 300));

  // Test list admin roles
  console.log('\n--- LIST ADMIN ROLES ---');
  res = await req('GET', '/api/v1/admin/roles');
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.body, null, 2).slice(0, 300));

  // Test list permissions
  console.log('\n--- LIST PERMISSIONS ---');
  res = await req('GET', '/api/v1/permissions');
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.body, null, 2).slice(0, 300));
}

run().catch(console.error);
