import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:3001/api/v1';

interface TokenHolder {
  token: string;
}

async function login(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }),
  });
  const json = await res.json();
  return json.data?.accessToken ?? json.accessToken;
}

function unwrap(json: any): any {
  return json?.data ?? json;
}

async function list(token: string, path: string): Promise<any> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  return { status: res.status, data: unwrap(json) };
}

async function main(): Promise<void> {
  const token = await login();
  const paths = ['/projects', '/suppliers', '/clients', '/subcontractors', '/categories', '/warehouses', '/inventory-items', '/employees', '/departments', '/fund-transactions', '/project-funds', '/approvals', '/notifications', '/stock-movements', '/roles', '/settings/finance', '/company'];
  for (const p of paths) {
    try {
      const r = await list(token, p);
      let item = null;
      let kind = 'array';
      const d = r.data;
      if (Array.isArray(d)) {
        item = d[0];
        kind = `array[${d.length}]`;
      } else if (d && typeof d === 'object') {
        const keys = Object.keys(d);
        const maybeArr = d.items ?? d.projects ?? d.result ?? d.data;
        if (Array.isArray(maybeArr)) {
          item = maybeArr[0];
          kind = `obj.items[${maybeArr.length}]`;
        } else {
          item = d;
        }
      }
      console.log(`\n### ${p} -> ${r.status} ${kind}`);
      if (item !== undefined) {
        const keys = Object.keys(item).slice(0, 40);
        console.log('  top-level keys:', keys.join(', '));
      }
    } catch (e: any) {
      console.log(`\n### ${p} ERROR: ${e.message}`);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });