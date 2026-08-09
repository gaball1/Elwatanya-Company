import { writeFileSync } from 'fs';
const api = 'http://localhost:3001/api/v1';
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = login?.data?.accessToken;
const h = { Authorization: `Bearer ${token}` };
const roles = await fetch(`${api}/admin/roles`, { headers: h }).then((r) => r.json());
const items = roles?.data?.items || roles?.items || [];
for (const r of items) {
  console.log(r.name.padEnd(24), 'permissions:', r.permissions.length, 'system:', r.isSystem);
}
const users = await fetch(`${api}/admin/users`, { headers: h }).then((r) => r.json());
for (const u of users?.data?.items || []) {
  console.log('USER', u.email, 'role:', u.role, 'roles:', (u.roles || []).map((x) => x.name).join(','));
}
writeFileSync('C:\\Users\\ABDELR~1\\AppData\\Local\\Temp\\opencode\\roles-list.json', JSON.stringify(items.map((r) => ({ name: r.name, perms: r.permissions.map((p) => p.name) })), null, 1));