import { chromium } from 'playwright';
const base = 'http://localhost:3000';
const api = 'http://localhost:3001/api/v1';
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = login?.data?.accessToken;
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(base + '/ar/logout', { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => { localStorage.setItem('elwataniya_access_token', t); document.cookie = `elwataniya_token=${t};path=/;SameSite=Lax;max-age=604800`; }, token);
await page.goto(base + '/ar/projects', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3500);
const bellBtn = page.locator('header button').filter({ has: page.locator('.lucide-bell') });
const n = await bellBtn.count();
console.log('bell buttons (class locator):', n);
if (n) {
  await bellBtn.first().click();
  await page.waitForTimeout(1500);
  const dropdown = page.locator('div.animate-fade-in-down').last();
  const dt = await dropdown.innerText().catch(() => '(none)');
  console.log('dropdown text:', JSON.stringify(dt.slice(0, 120)));
  const viewAll = page.locator('a', { hasText: /عرض الكل|View all/ }).first();
  console.log('view-all count:', await viewAll.count());
  await viewAll.click();
  await page.waitForTimeout(2500);
  console.log('path after view-all:', page.url());
}
await browser.close();