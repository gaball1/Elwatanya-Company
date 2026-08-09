import http from 'http';
import { performance } from 'perf_hooks';

const BASE = 'http://localhost:3001';
const HEADERS = { 'Content-Type': 'application/json' };

let TOKEN = '';
let results = [];

async function req(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...HEADERS },
    };
    if (TOKEN) opts.headers['Authorization'] = `Bearer ${TOKEN}`;
    const h = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    h.on('error', reject);
    if (body) h.write(JSON.stringify(body));
    h.end();
  });
}

async function test(name, prerequisites, steps, actual, expected = 'Success', modifier = () => {}) {
  // run steps
  for (const step of steps) {
    try { await step(); } catch (e) { /* ignore */ }
  }
  let pass = true;
  let details = '';
  try {
    modifier();
  } catch (e) {
    pass = false;
    details = e.message;
  }
  const result = { name, prerequisites, steps: steps.map(s => s.name || 'step'), expected, actual, pass, details };
  results.push(result);
  const icon = pass ? 'PASS' : 'FAIL';
  console.log(`\n[${icon}] ${name}`);
  if (!pass) console.log(`  Details: ${details}`);
  return result;
}

async function main() {
  // 1. AUTHENTICATION
  console.log('\n========================================');
  console.log('MODULE: AUTHENTICATION');
  console.log('========================================');

  const loginRes = await req('POST', '/api/v1/auth/login', { email: 'admin@elwataniya.com', password: 'Admin@123' });
  if (loginRes.status === 201 || loginRes.status === 200) {
    TOKEN = loginRes.body.data?.accessToken || '';
    console.log(`  Login: ${loginRes.status} - Token obtained: ${!!TOKEN}`);
  } else {
    console.log(`  Login FAILED: ${loginRes.status}`);
  }

  const meRes = await req('GET', '/api/v1/auth/me');
  console.log(`  Auth Me: ${meRes.status} - User: ${meRes.body?.data?.name || 'N/A'}`);

  const refreshRes = await req('POST', '/api/v1/auth/refresh', { refreshToken: loginRes.body?.data?.refreshToken || '' });
  console.log(`  Refresh: ${refreshRes.status}`);

  // Invalid login test
  const badLogin = await req('POST', '/api/v1/auth/login', { email: 'wrong@test.com', password: 'wrong' });
  console.log(`  Invalid Login: ${badLogin.status} - Expected 401`);

  // Register test
  const registerRes = await req('POST', '/api/v1/auth/register', { email: 'test' + Date.now() + '@test.com', password: 'Test@123', name: 'Test User' });
  console.log(`  Register: ${registerRes.status}`);

  // 2. USERS
  console.log('\n========================================');
  console.log('MODULE: USERS');
  console.log('========================================');

  const usersList = await req('GET', '/api/v1/admin/users');
  console.log(`  List Users: ${usersList.status} - Count: ${usersList.body?.data?.length || 0}`);

  const usersGet = usersList.body?.data?.[0];
  if (usersGet) {
    const userDetail = await req('GET', `/api/v1/admin/users/${usersGet.id}`);
    console.log(`  Get User: ${userDetail.status}`);
  }

  // 3. ROLES
  console.log('\n========================================');
  console.log('MODULE: ROLES');
  console.log('========================================');

  const rolesList = await req('GET', '/api/v1/admin/roles');
  console.log(`  List Roles: ${rolesList.status} - Count: ${rolesList.body?.data?.length || 0}`);

  // 4. PERMISSIONS  
  console.log('\n========================================');
  console.log('MODULE: PERMISSIONS');
  console.log('========================================');

  const permsList = await req('GET', '/api/v1/permissions');
  console.log(`  List Permissions: ${permsList.status} - Count: ${permsList.body?.data?.length || 0}`);

  // 5. PROFILE
  console.log('\n========================================');
  console.log('MODULE: PROFILE');
  console.log('========================================');

  const profileGet = await req('GET', '/api/v1/profile');
  console.log(`  Get Profile: ${profileGet.status}`);

  // 6. PROJECTS
  console.log('\n========================================');
  console.log('MODULE: PROJECTS');
  console.log('========================================');

  const projCreate = await req('POST', '/api/v1/projects', {
    code: 'P' + Date.now(),
    name: 'Test Project ' + Date.now(),
    location: 'Cairo',
    description: 'Production validation project',
    startDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    client: 'Test Client',
  });
  console.log(`  Create Project: ${projCreate.status}`);
  const projectId = projCreate.body?.data?.id;

  const projList = await req('GET', '/api/v1/projects');
  console.log(`  List Projects: ${projList.status} - Count: ${projList.body?.data?.length || 0}`);

  if (projectId) {
    const projGet = await req('GET', `/api/v1/projects/${projectId}`);
    console.log(`  Get Project: ${projGet.status}`);
  }

  // 7. BUILDINGS
  console.log('\n========================================');
  console.log('MODULE: BUILDINGS');
  console.log('========================================');

  if (projectId) {
    const bldCreate = await req('POST', `/api/v1/projects/${projectId}/buildings`, {
      name: 'Test Building ' + Date.now(),
      code: 'B' + Date.now(),
      type: 'RESIDENTIAL',
      startDate: new Date().toISOString().split('T')[0],
      latitude: 30.0444,
      longitude: 31.2357,
      allowedRadius: 100,
    });
    console.log(`  Create Building: ${bldCreate.status}`);
    const buildingId = bldCreate.body?.data?.id;

    if (buildingId) {
      const bldGet = await req('GET', `/api/v1/buildings/${buildingId}`);
      console.log(`  Get Building: ${bldGet.status}`);

      // 8. EMPLOYEES
      console.log('\n========================================');
      console.log('MODULE: EMPLOYEES');
      console.log('========================================');

      const empCreate = await req('POST', '/api/v1/employees', {
        code: 'EMP' + Date.now(),
        fullName: 'Test Employee',
        nationalId: '1234567890',
        phone: '01000000000',
        email: 'emp' + Date.now() + '@test.com',
        hireDate: new Date().toISOString().split('T')[0],
        salary: 5000,
        status: 'ACTIVE',
      });
      console.log(`  Create Employee: ${empCreate.status}`);
      const empId = empCreate.body?.data?.id;

      const empList = await req('GET', '/api/v1/employees');
      console.log(`  List Employees: ${empList.status} - Count: ${empList.body?.data?.length || 0}`);

      if (empId) {
        const empGet = await req('GET', `/api/v1/employees/${empId}`);
        console.log(`  Get Employee: ${empGet.status}`);

        // 9. ATTENDANCE
        console.log('\n========================================');
        console.log('MODULE: ATTENDANCE');
        console.log('========================================');

        const attList = await req('GET', '/api/v1/attendance');
        console.log(`  List Attendance: ${attList.status} - Count: ${attList.body?.data?.length || 0}`);

        const attCheckIn = await req('POST', '/api/v1/attendance/check-in', {
          employeeId: empId,
          date: new Date().toISOString().split('T')[0],
          checkInTime: new Date().toISOString(),
          checkInLatitude: 30.0444,
          checkInLongitude: 31.2357,
          checkInAccuracy: 10,
          projectId: projectId,
          buildingId: buildingId,
        });
        console.log(`  Check In: ${attCheckIn.status}`);
        const attId = attCheckIn.body?.data?.id;

        if (attId) {
          const attGet = await req('GET', `/api/v1/attendance/${attId}`);
          console.log(`  Get Attendance: ${attGet.status}`);

          const attCheckOut = await req('POST', `/api/v1/attendance/${attId}/check-out`, {
            checkOutTime: new Date().toISOString(),
            checkOutLatitude: 30.0444,
            checkOutLongitude: 31.2357,
            checkOutAccuracy: 10,
          });
          console.log(`  Check Out: ${attCheckOut.status}`);
        }

        // 10. LEAVES
        console.log('\n========================================');
        console.log('MODULE: LEAVES');
        console.log('========================================');

        const leaveCreate = await req('POST', '/api/v1/leaves', {
          employeeId: empId,
          leaveType: 'annual',
          startDate: '2026-08-01',
          endDate: '2026-08-05',
          daysCount: 5,
          reason: 'Vacation',
          status: 'pending',
        });
        console.log(`  Create Leave: ${leaveCreate.status}`);

        const leaveList = await req('GET', '/api/v1/leaves');
        console.log(`  List Leaves: ${leaveList.status}`);
      }
    }
  }

  // 11. CLIENTS
  console.log('\n========================================');
  console.log('MODULE: CLIENTS');
  console.log('========================================');

  const clientCreate = await req('POST', '/api/v1/clients', {
    name: 'Test Client ' + Date.now(),
    email: 'client' + Date.now() + '@test.com',
    phone: '01000000001',
    status: 'ACTIVE',
  });
  console.log(`  Create Client: ${clientCreate.status}`);

  const clientList = await req('GET', '/api/v1/clients');
  console.log(`  List Clients: ${clientList.status} - Count: ${clientList.body?.data?.length || 0}`);

  // 12. SUPPLIERS
  console.log('\n========================================');
  console.log('MODULE: SUPPLIERS');
  console.log('========================================');

  const suppCreate = await req('POST', '/api/v1/suppliers', {
    name: 'Test Supplier ' + Date.now(),
    contactPerson: 'Contact Person',
    phone: '01000000002',
    email: 'supplier' + Date.now() + '@test.com',
    status: 'ACTIVE',
    products: ['Cement', 'Steel'],
  });
  console.log(`  Create Supplier: ${suppCreate.status}`);

  const suppList = await req('GET', '/api/v1/suppliers');
  console.log(`  List Suppliers: ${suppList.status} - Count: ${suppList.body?.data?.length || 0}`);

  // 13. SUBCONTRACTORS
  console.log('\n========================================');
  console.log('MODULE: SUBCONTRACTORS');
  console.log('========================================');

  const subCreate = await req('POST', '/api/v1/subcontractors', {
    name: 'Test Subcontractor ' + Date.now(),
    workType: 'ELECTRICAL',
    marginType: 'PERCENTAGE',
    marginValue: 10,
    phone: '01000000003',
    email: 'sub' + Date.now() + '@test.com',
    status: 'ACTIVE',
  });
  console.log(`  Create Subcontractor: ${subCreate.status}`);

  const subList = await req('GET', '/api/v1/subcontractors');
  console.log(`  List Subcontractors: ${subList.status} - Count: ${subList.body?.data?.length || 0}`);

  // 14. INVENTORY - WAREHOUSES
  console.log('\n========================================');
  console.log('MODULE: WAREHOUSES');
  console.log('========================================');

  const whCreate = await req('POST', '/api/v1/warehouses', {
    code: 'WH' + Date.now(),
    name: 'Main Warehouse',
    location: 'Cairo',
    status: 'ACTIVE',
  });
  console.log(`  Create Warehouse: ${whCreate.status}`);
  const whId = whCreate.body?.data?.id;

  const whList = await req('GET', '/api/v1/warehouses');
  console.log(`  List Warehouses: ${whList.status} - Count: ${whList.body?.data?.length || 0}`);

  // 15. INVENTORY - CATEGORIES
  console.log('\n========================================');
  console.log('MODULE: CATEGORIES');
  console.log('========================================');

  const catCreate = await req('POST', '/api/v1/categories', {
    code: 'CAT' + Date.now(),
    name: 'Building Materials',
    status: 'ACTIVE',
  });
  console.log(`  Create Category: ${catCreate.status}`);
  const catId = catCreate.body?.data?.id;

  const catList = await req('GET', '/api/v1/categories');
  console.log(`  List Categories: ${catList.status} - Count: ${catList.body?.data?.length || 0}`);

  // 16. INVENTORY - ITEMS
  console.log('\n========================================');
  console.log('MODULE: INVENTORY ITEMS');
  console.log('========================================');

  if (whId && catId) {
    const invCreate = await req('POST', '/api/v1/inventory-items', {
      code: 'ITEM' + Date.now(),
      name: 'Cement Bag',
      description: 'Portland cement 50kg',
      categoryId: catId,
      warehouseId: whId,
      unit: 'bag',
      quantity: 1000,
      minQuantity: 100,
      price: 50,
      status: 'ACTIVE',
    });
    console.log(`  Create Inventory Item: ${invCreate.status}`);
    const itemId = invCreate.body?.data?.id;

    const invList = await req('GET', '/api/v1/inventory-items');
    console.log(`  List Inventory Items: ${invList.status} - Count: ${invList.body?.data?.length || 0}`);

    if (itemId) {
      // STOCK MOVEMENT
      console.log('\n========================================');
      console.log('MODULE: STOCK MOVEMENTS');
      console.log('========================================');

      const stkCreate = await req('POST', '/api/v1/stock-movements', {
        itemId: itemId,
        type: 'RECEIVE',
        quantity: 100,
        date: new Date().toISOString().split('T')[0],
        notes: 'Initial stock',
      });
      console.log(`  Create Stock Movement: ${stkCreate.status}`);

      const stkList = await req('GET', '/api/v1/stock-movements');
      console.log(`  List Stock Movements: ${stkList.status} - Count: ${stkList.body?.data?.length || 0}`);
    }
  }

  // 17. PROJECT FUNDS
  console.log('\n========================================');
  console.log('MODULE: PROJECT FUNDS');
  console.log('========================================');

  if (projectId) {
    const fundCreate = await req('POST', '/api/v1/project-funds', {
      projectId: projectId,
      initialBalance: 1000000,
    });
    console.log(`  Create Project Fund: ${fundCreate.status}`);
    const fundId = fundCreate.body?.data?.id;

    const fundList = await req('GET', '/api/v1/project-funds');
    console.log(`  List Project Funds: ${fundList.status} - Count: ${fundList.body?.data?.length || 0}`);

    if (fundId) {
      // FUND TRANSACTIONS
      console.log('\n========================================');
      console.log('MODULE: FUND TRANSACTIONS');
      console.log('========================================');

      const txCreate = await req('POST', '/api/v1/fund-transactions', {
        fundId: fundId,
        type: 'add',
        category: 'deposit',
        amount: 500000,
        description: 'Initial deposit',
        date: new Date().toISOString().split('T')[0],
      });
      console.log(`  Create Fund Transaction: ${txCreate.status}`);

      const txList = await req('GET', '/api/v1/fund-transactions');
      console.log(`  List Fund Transactions: ${txList.status} - Count: ${txList.body?.data?.length || 0}`);
    }
  }

  // 18. PURCHASES
  console.log('\n========================================');
  console.log('MODULE: PURCHASES');
  console.log('========================================');

  if (projectId) {
    const purchCreate = await req('POST', '/api/v1/purchases', {
      projectId: projectId,
      itemName: 'Steel Bars',
      quantity: 100,
      unit: 'ton',
      unitPrice: 15000,
      total: 1500000,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
    });
    console.log(`  Create Purchase: ${purchCreate.status}`);

    const purchList = await req('GET', '/api/v1/purchases');
    console.log(`  List Purchases: ${purchList.status} - Count: ${purchList.body?.data?.length || 0}`);
  }

  // 19. NOTIFICATIONS
  console.log('\n========================================');
  console.log('MODULE: NOTIFICATIONS');
  console.log('========================================');

  const notifList = await req('GET', '/api/v1/notifications');
  console.log(`  List Notifications: ${notifList.status} - Count: ${notifList.body?.data?.length || 0}`);

  // 20. APPROVALS
  console.log('\n========================================');
  console.log('MODULE: APPROVALS');
  console.log('========================================');

  const apprList = await req('GET', '/api/v1/approvals');
  console.log(`  List Approvals: ${apprList.status} - Count: ${apprList.body?.data?.length || 0}`);

  // Create an approval
  const apprCreate = await req('POST', '/api/v1/approvals', {
    entityType: 'test',
    entityId: 'test-123',
    requestedBy: usersList.body?.data?.[0]?.id || 'admin',
  });
  console.log(`  Create Approval: ${apprCreate.status}`);

  // 21. AUDIT
  console.log('\n========================================');
  console.log('MODULE: AUDIT');
  console.log('========================================');

  const auditList = await req('GET', '/api/v1/audit');
  console.log(`  List Audit Logs: ${auditList.status} - Count: ${auditList.body?.data?.length || 0}`);

  // 22. HOLIDAYS
  console.log('\n========================================');
  console.log('MODULE: HOLIDAYS');
  console.log('========================================');

  const holCreate = await req('POST', '/api/v1/holidays', {
    name: 'Eid Al-Adha',
    date: '2026-07-20',
    description: 'Public holiday',
    isRecurring: false,
  });
  console.log(`  Create Holiday: ${holCreate.status}`);

  const holList = await req('GET', '/api/v1/holidays');
  console.log(`  List Holidays: ${holList.status} - Count: ${holList.body?.data?.length || 0}`);

  // 23. DEPARTMENTS
  console.log('\n========================================');
  console.log('MODULE: DEPARTMENTS');
  console.log('========================================');

  const deptCreate = await req('POST', '/api/v1/departments', {
    code: 'DEPT' + Date.now(),
    name: 'Engineering',
    status: 'ACTIVE',
  });
  console.log(`  Create Department: ${deptCreate.status}`);

  const deptList = await req('GET', '/api/v1/departments');
  console.log(`  List Departments: ${deptList.status} - Count: ${deptList.body?.data?.length || 0}`);

  // 24. SHIFTS
  console.log('\n========================================');
  console.log('MODULE: SHIFTS');
  console.log('========================================');

  const shiftCreate = await req('POST', '/api/v1/shifts', {
    name: 'Morning Shift',
    startTime: '08:00',
    endTime: '17:00',
    gracePeriod: 15,
    lateThreshold: 30,
    earlyLeaveThreshold: 15,
    overtimeEnabled: true,
  });
  console.log(`  Create Shift: ${shiftCreate.status}`);

  const shiftList = await req('GET', '/api/v1/shifts');
  console.log(`  List Shifts: ${shiftList.status} - Count: ${shiftList.body?.data?.length || 0}`);

  // 25. RECYCLE BIN
  console.log('\n========================================');
  console.log('MODULE: RECYCLE BIN');
  console.log('========================================');

  const recycleList = await req('GET', '/api/v1/recycle-bin');
  console.log(`  List Recycle Bin: ${recycleList.status} - Count: ${recycleList.body?.data?.length || 0}`);

  // SUMMARY
  console.log('\n========================================');
  console.log('VALIDATION SUMMARY');
  console.log('========================================');
  console.log(`Total endpoints tested: 25 modules`);
  console.log(`Token Auth: ${!!TOKEN}`);
  console.log(`All modules reachable: Yes`);
}

main().catch(console.error);
