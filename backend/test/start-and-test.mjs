import { spawn } from 'child_process';
import http from 'http';

async function waitForServer(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => resolve());
        });
        req.on('error', reject);
        req.end();
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
}

function req(m, p, b, token) {
  return new Promise(r => {
    const u = new URL(p, 'http://localhost:3001');
    const h = http.request({method:m, hostname:u.hostname, port:u.port, path:u.pathname+u.search, headers:{'Content-Type':'application/json', ...(token ? {'Authorization':'Bearer '+token}: {})}}, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>r({s:res.statusCode,b:JSON.parse(d)})); });
    h.on('error',e=>r({s:0,b:e.message})); if(b) h.write(JSON.stringify(b)); h.end();
  });
}

async function main() {
  console.log('Starting server...');
  const server = spawn('node', ['dist/src/main.js'], {
    cwd: 'D:\\elwataniya-company\\backend',
    stdio: 'pipe',
  });
  server.stdout.on('data', d => process.stdout.write(d));
  server.stderr.on('data', d => process.stderr.write(d));

  console.log('Waiting for server...');
  const ready = await waitForServer('http://localhost:3001/api/v1/health');
  if (!ready) { console.log('Server failed to start'); server.kill(); process.exit(1); }
  console.log('Server ready!\n');

  // Login
  let r = await req('POST', '/api/v1/auth/login', {email:'admin@elwataniya.com',password:'Admin@123'});
  const token = r.b?.data?.accessToken;
  console.log('Login:', r.s, token ? 'OK' : 'FAIL');

  // Get project
  r = await req('GET', '/api/v1/projects', null, token);
  const pid = r.b?.data?.projects?.[0]?.id;
  console.log('Project:', pid);

  if (pid) {
    // TEST 1: Create building WITH geolocation fields
    r = await req('POST', '/api/v1/projects/' + pid + '/buildings', {
      name: 'Production Test Building',
      code: 'B' + Date.now(),
      type: 'RESIDENTIAL',
      startDate: '2026-07-30',
      latitude: 30.0444,
      longitude: 31.2357,
      allowedRadius: 100,
    }, token);
    const bldId = r.b?.data?.building?.id || r.b?.data?.id;
    console.log('\nCREATE BUILDING (with lat/lng):', r.s, 'ID:', bldId, r.b?.message || '');

    if (bldId) {
      // GET building
      r = await req('GET', '/api/v1/buildings/' + bldId, null, token);
      console.log('GET BUILDING:', r.s, 'Lat:', r.b?.data?.building?.latitude, 'Lng:', r.b?.data?.building?.longitude, 'Radius:', r.b?.data?.building?.allowedRadius);

      // UPDATE building
      r = await req('PATCH', '/api/v1/buildings/' + bldId, {
        name: 'Updated Building',
        latitude: 30.0500,
        longitude: 31.2400,
        allowedRadius: 150,
      }, token);
      console.log('UPDATE BUILDING:', r.s, 'Lat:', r.b?.data?.building?.latitude, 'Lng:', r.b?.data?.building?.longitude);

      // Assign subcontractor test - need subcontractor ID
      r = await req('GET', '/api/v1/subcontractors', null, token);
      const subId = r.b?.data?.items?.[0]?.id;
      if (subId) {
        r = await req('POST', '/api/v1/buildings/' + bldId + '/subcontractors', { subcontractorId: subId, workType: 'ELECTRICAL' }, token);
        console.log('ASSIGN SUBCONTRACTOR:', r.s, r.b?.message || 'OK');
      }

      // DELETE building
      r = await req('DELETE', '/api/v1/buildings/' + bldId, null, token);
      console.log('DELETE BUILDING:', r.s);

      // Verify in recycle bin
      r = await req('GET', '/api/v1/recycle-bin', null, token);
      console.log('RECYCLE BIN:', r.s, 'count:', r.b?.data?.length || r.b?.data?.items?.length || '?');
    }
  }

  server.kill();
  console.log('\nDone.');
}
main().catch(console.error);
