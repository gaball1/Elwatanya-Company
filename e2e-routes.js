const { chromium } = require('playwright');

const ROUTES = [
  '/ar/admin', '/ar/admin/users', '/ar/roles', '/ar/pending-signatures', '/ar/admin/signatures',
  '/ar/projects', '/ar/projects/new', '/ar/project-boards', '/ar/bi-dashboard', '/ar/executive-dashboard',
  '/ar/analytics', '/ar/employees', '/ar/departments', '/ar/attendance', '/ar/attendance/overrides',
  '/ar/holidays', '/ar/subcontractors', '/ar/subcontractors/new', '/ar/clients', '/ar/suppliers',
  '/ar/warehouses', '/ar/categories', '/ar/inventory', '/ar/inventory/movement/new', '/ar/approvals',
  '/ar/statements', '/ar/statements/new', '/ar/client-statements', '/ar/notifications', '/ar/reports',
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/ar/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#email', 'admin@elwataniya.com');
  await page.fill('#password', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  const results = [];
  for (const route of ROUTES) {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
    page.on('console', m => { if (m.type() === 'error') errors.push('[c]' + m.text().slice(0, 120)); });
    try {
      await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) { errors.push('NAV:' + e.message.split('\n')[0].slice(0, 120)); }
    await page.waitForTimeout(600);
    const url = page.url().replace('http://localhost:3000', '');
    const headings = await page.$$eval('h1,h2,h3', els => els.slice(0, 6).map(e => (e.textContent || '').trim().slice(0, 60)).filter(Boolean));
    const forms = await page.$$eval('form', els => els.length);
    const tables = await page.$$eval('table', els => els.length);
    const inputs = await page.$$eval('input,select,textarea', els => els.length);
    const bodyLen = (await page.evaluate(() => document.body.innerText.length)) || 0;
    results.push({ route, url, headings, forms, tables, inputs, bodyLen, errors: errors.slice(0, 3) });
  }
  console.log(JSON.stringify(results, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });