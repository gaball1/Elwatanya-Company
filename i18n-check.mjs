import { chromium } from 'playwright';
const base = 'http://localhost:3000';
const api = 'http://localhost:3001/api/v1';
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = login?.data?.accessToken;
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const out = [];

const seed = async () => {
  await page.goto(base + '/ar/logout', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => { localStorage.setItem('elwataniya_access_token', t); document.cookie = `elwataniya_token=${t};path=/;SameSite=Lax;max-age=604800`; }, token);
};

// navigate both locales on several pages; capture nav heights+sidenav text
const pages = ['projects', 'attendance', 'reports', 'bi-dashboard', 'analytics', 'inventory', 'treasury'];
for (const p of pages) {
  await seed();
  await page.goto(`${base}/ar/${p}`, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const arTexts = await page.evaluate(() => {
    const nav = document.querySelector('aside, nav')?.innerText || '';
    const h = document.querySelector('h1, h2')?.textContent || '';
    const buttons = Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter((t) => t && t.length < 40).slice(0, 6);
    return { nav: nav.slice(0, 240).replace(/\n/g, '|'), h: h.trim().slice(0, 60), buttons };
  });
  await seed();
  await page.goto(`${base}/en/${p}`, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const enTexts = await page.evaluate(() => {
    const nav = document.querySelector('aside, nav')?.innerText || '';
    const h = document.querySelector('h1, h2')?.textContent || '';
    const buttons = Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter((t) => t && t.length < 40).slice(0, 6);
    return { nav: nav.slice(0, 240).replace(/\n/g, '|'), h: h.trim().slice(0, 60), buttons };
  });
  const hasArabicNav = /[\\u0600-\\u06FF]/.test(arTexts.nav);
  const enClean = !/[\\u0600-\\u06FF]/.test(enTexts.nav) ? 'clean' : 'CONTAINS ARABIC';
  const arHead = arTexts.h ? 'ar-head' : 'no-head';
  const enHead = enTexts.h ? 'en-head' : 'no-head';
  const arBtns = arTexts.buttons.length;
  const enBtns = enTexts.buttons.length;
  out.push(`[${p}] arNavArabic=${hasArabicNav} arHead="${arTexts.h}" arBtns=${arBtns}`);
  out.push(`[${p}] enNav=${enClean} enHead="${enTexts.h}" enBtns=${enBtns}`);
  out.push(`[${p}] enNavSnippet=${JSON.stringify(enTexts.nav.slice(0, 100))}`);
  out.push(`[${p}] arNavSnippet=${JSON.stringify(arTexts.nav.slice(0, 100))}`);
}
console.log(out.join('\n'));
await browser.close();