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
await page.goto(base + '/ar', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3500);
const info = await page.evaluate(() => {
  const hdrs = Array.from(document.querySelectorAll('header'));
  const btns = Array.from(document.querySelectorAll('header button')).map((b) => {
    const svg = b.querySelector('svg');
    return (svg ? (svg.getAttribute('class') || 'svgnoclass') : 'no-svg') + ' :: ' + (b.textContent || '').trim().slice(0, 30);
  });
  return { headerCount: hdrs.length, btns };
});
console.log(JSON.stringify(info, null, 1));
// also full body has any bell?
const bellAnywhere = await page.locator('.lucide-bell').count();
console.log('.lucide-bell anywhere:', bellAnywhere);
await browser.close();