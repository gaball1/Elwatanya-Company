import { chromium } from 'playwright';

const base = 'http://localhost:3000';
const api = 'http://localhost:3001/api/v1';

const loginJson = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = loginJson?.data?.accessToken;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const events = [];
page.on('request', (r) => { if (r.url().includes('/reporting/')) events.push('[req ' + r.method() + '] ' + r.url().replace('http://localhost:3001/api/v1', '')); });
page.on('response', (r) => { if (r.url().includes('/api/v1/reporting')) events.push('[resp] ' + r.status() + ' ' + r.url().replace('http://localhost:3001/api/v1', '')); });
page.on('console', (m) => events.push('[console] ' + m.type() + ': ' + m.text().slice(0, 200)));
page.on('pageerror', (e) => events.push('[pageerror] ' + String(e).slice(0, 300)));

await page.goto(base + '/ar/logout', { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => {
  localStorage.setItem('elwataniya_access_token', t);
  document.cookie = `elwataniya_token=${t};path=/;SameSite=Lax;max-age=604800`;
}, token);

await page.goto(base + '/ar/reports', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(5000);

const pv = page.locator('button', { hasText: /معاينة|Preview/ }).first();
events.push('preview btn count: ' + (await pv.count()));
await pv.click();

await page.waitForTimeout(7000);
const dlg = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  return d ? d.innerHTML.slice(0, 500) : '(no dialog)';
});
events.push('dialog: ' + dlg.replace(/\n/g, ' '));
events.push('has-table: ' + (await page.evaluate(() => document.body.querySelector('[role="dialog"] table') ? 'yes' : 'no')));

console.log(events.join('\n'));
await browser.close();