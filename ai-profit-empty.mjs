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
  return { status: res.status, json };
}

const login = await api('/auth/login', null, 'POST', { email: 'admin@elwataniya.com', password: 'Admin@123' });
const token = login.json.data.accessToken;

for (const q of ['اعرض أرباح مشروع A170', 'ليه مشروع A170 فيه ربح صفر']) {
  const r = await api('/ai-agent/chat', token, 'POST', { message: q, context: {} });
  const d = r.json ?? {};
  const content = d?.message ?? d?.content ?? d?.reply ?? JSON.stringify(d);
  const clean = String(content).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '[uuid]');
  console.log(`Q: ${q}`);
  console.log(`  status=${r.status} success=${d?.success} intent=${d?.intent}`);
  console.log(`  msgLen=${clean.length}`);
  console.log(`  ${clean.split('\n').slice(0, 4).join(' | ')}`);
  console.log('  hasNaN=', /NaN|Infinity/.test(clean));
  console.log('---');
  const { json: convs } = await api('/ai-agent/conversations', token);
  const list = convs?.data?.items ?? convs?.items ?? convs ?? [];
  if (Array.isArray(list) && list.length) {
    const id = list[list.length - 1].id;
    await api(`/ai-agent/conversations/${id}`, token, 'DELETE');
  }
}