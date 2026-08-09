const BASE = 'http://localhost:3001/api/v1';

async function api(path, token, method = 'GET', body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return json;
}

const login = await api('/auth/login', null, 'POST', { email: 'admin@elwataniya.com', password: 'Admin@123' });
const token = login.data.accessToken;

const data = await api('/ai-agent/conversations', token);
const items = data?.data?.items ?? data?.items ?? data ?? [];
console.log('total conversations:', Array.isArray(items) ? items.length : 'n/a');

let deleted = 0;
if (Array.isArray(items)) {
  for (const c of items) {
    const title = String(c?.title ?? c?.subject ?? '').toLowerCase();
    const firstMsg = String(c?.firstMessage ?? '').toLowerCase();
    if (title.includes('A170'.toLowerCase()) || firstMsg.includes('A170'.toLowerCase()) ||
        firstMsg.includes('اعرض أرباح') || firstMsg.includes('ربح صفر') || firstMsg.includes('A170')) {
      const r = await api(`/ai-agent/conversations/${c.id}`, token, 'DELETE');
      if (r && (r.status === undefined || r.data !== undefined)) deleted++;
      console.log(`deleted ${c.id}`);
    }
  }
}
console.log(`deleted ${deleted} conversations`);
const after = await api('/ai-agent/conversations', token);
const afterItems = after?.data?.items ?? after?.items ?? after ?? [];
console.log('remaining conversations:', Array.isArray(afterItems) ? afterItems.length : 'n/a');