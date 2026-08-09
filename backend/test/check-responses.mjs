import http from 'http';

const BASE = 'http://localhost:3001';
let TOKEN = '';

function req(m, p, b) {
  return new Promise(r => {
    const u = new URL(p, BASE);
    const h = http.request({method:m,hostname:u.hostname,port:u.port,path:u.pathname+u.search,headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN}}, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>r({s:res.statusCode,b:JSON.parse(d)})); });
    h.on('error',e=>r({s:0,b:e.message})); if(b) h.write(JSON.stringify(b)); h.end();
  });
}

async function main() {
  let r = await req('POST','/api/v1/auth/login',{email:'admin@elwataniya.com',password:'Admin@123'});
  TOKEN = r.b?.data?.accessToken;
  console.log('TOKEN:', TOKEN ? 'OK' : 'FAIL');

  // Auth Me
  r = await req('GET','/api/v1/auth/me');
  console.log('AUTH ME:', r.s, 'data keys:', r.b?.data ? Object.keys(r.b.data) : 'none', 'name:', r.b?.data?.name || r.b?.data?.user?.name);

  // Projects
  r = await req('GET','/api/v1/projects');
  console.log('PROJECTS:', r.s, 'data keys:', r.b?.data ? Object.keys(r.b.data) : 'none');

  const projectId = r.b?.data?.projects?.[0]?.id;
  if (projectId) {
    // Create building
    const path = '/api/v1/projects/' + projectId + '/buildings';
    r = await req('POST', path, {name:'Test Bld',code:'B'+Date.now(),type:'RESIDENTIAL',startDate:'2026-07-30',latitude:30.0444,longitude:31.2357,allowedRadius:100});
    console.log('CREATE BLD:', r.s, 'data keys:', r.b?.data ? Object.keys(r.b.data) : 'none', 'id:', r.b?.data?.building?.id || r.b?.data?.id);
  }

  // Other list endpoints
  const endpoints = [
    'clients', 'suppliers', 'subcontractors', 'employees',
    'warehouses', 'categories', 'inventory-items',
    'departments', 'holidays', 'leaves',
    'project-funds', 'fund-transactions', 'purchases',
    'notifications', 'approvals', 'audit',
    'shifts', 'recycle-bin', 'stock-movements',
    'project-boards', 'client-statements', 'subcontractor-statements',
    'attendance',
  ];
  
  for (const ep of endpoints) {
    r = await req('GET', '/api/v1/' + ep);
    const keys = r.b?.data ? Object.keys(r.b.data) : [];
    const count = Array.isArray(r.b?.data) ? r.b.data.length : 
                  r.b?.data?.items?.length ||
                  r.b?.data?.[ep]?.length ||
                  r.b?.data?.[Object.keys(r.b?.data || {})[0]]?.length ||
                  '?';
    console.log((r.s === 200 ? 'OK ' : 'ERR') + ' ' + ep + ': ' + r.s + ' keys=[' + keys.join(',') + '] count=' + count);
  }
}
main().catch(console.error);
