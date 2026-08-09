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
  return { status: res.status, json, headers: res.headers, text: () => text };
}

const login = await api('/auth/login', null, 'POST', { email: 'admin@elwataniya.com', password: 'Admin@123' });
const token = login.json?.data?.accessToken;
console.log('login status:', login.status, token ? 'OK' : 'FAIL');

const list = await api('/reporting/reports', token);
const reports = list.json?.data ?? list.json;
console.log('reports:', JSON.stringify(reports?.map((r) => r.name) ?? reports, null, 1));

const projectResp = await api('/projects', token);
const projects = projectResp.json?.items ?? projectResp.json?.data ?? [];
const projectId = projects?.[0]?.id;
console.log('first project:', projects?.[0]?.code, projectId ? 'id OK' : 'NONE');

for (const report of reports ?? []) {
  const name = report.name;
  const params = report.requiresProject && projectId ? { projectId } : {};
  for (const fmt of report.supportedFormats ?? ['pdf']) {
    const r = await api(`/reporting/${name}/generate?format=${fmt}`, token, 'POST', params);
    const bytes = r.headers ? Array.from(await r.headers.get('content-length') ?? '' ) : [];
    const buf = Buffer.from(r.text(), 'utf-8');
    const magic = buf.length >= 4 ? buf.slice(0, 4).toString('utf8') : '(empty)';
    const len = buf.length;
    const cd = r.headers?.get('content-disposition')?.slice(0, 90) ?? 'none';
    console.log(`${fmt.padEnd(6)} ${name.padEnd(22)} status=${r.status} size=${len} magic=${JSON.stringify(magic)} cd=${cd}`);
  }
  // preview
  const q = new URLSearchParams(params).toString();
  const p = await api(`/reporting/${name}/preview?${q}`, token);
  const previewText = p.text().slice(0, 120);
  const looksHtml = /<(!DOCTYPE|html|div|table)/i.test(previewText);
  const looksPdfGarbage = previewText.includes('%PDF') || /\uFFFD/.test(previewText);
  console.log(`PREVIEW ${name.padEnd(20)} status=${p.status} html=${looksHtml} pdfgarbage=${looksPdfGarbage} text=${JSON.stringify(previewText.slice(0, 80))}`);
}