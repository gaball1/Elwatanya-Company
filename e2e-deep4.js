const { chromium } = require('playwright');

const P = 'df50a993-0dee-4654-adb9-7249fe0fdaac';
const B = '91e1f2c1-76e8-460a-8373-4990f65f5142';
const SUB = 'f62a4ee7-11f4-4c14-8eb2-e68f3b3b520b';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/ar/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#email', 'admin@elwataniya.com');
  await page.fill('#password', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  for (const route of [
    `/ar/projects/${P}/buildings/${B}/subcontractors/${SUB}`,
    `/ar/projects/${P}/buildings/${B}/subcontractors/${SUB}/extracts`,
    `/ar/projects/${P}/buildings/${B}/subcontractors/${SUB}/extracts/new`,
    `/ar/projects/${P}/buildings/${B}/subcontractors/${SUB}/payments`,
  ]) {
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    const navErr = [];
    try { await page.goto('http://localhost:3000' + route, { waitUntil: 'domcontentloaded', timeout: 25000 }); }
    catch (e) { navErr.push(e.message.split('\n')[0].slice(0, 60)); }
    await page.waitForTimeout(1800);
    const h = await page.$$eval('h1,h2,h3', els => els.slice(0, 8).map(e => (e.textContent || '').trim().slice(0, 50)).filter(Boolean));
    const btns = await page.$$eval('button', els => els.slice(0, 14).map(e => (e.textContent || '').trim().slice(0, 26)).filter(Boolean));
    const inputs = await page.$$eval('input,select,textarea', els => els.length);
    const links = await page.$$eval('a', els => els.slice(0, 20).map(e => (e.getAttribute('href') || '').slice(0, 60)).filter(h => h.startsWith('/ar')));
    console.log(`\n### ${route}\n  inputs=${inputs} nav=${JSON.stringify(navErr)}\n  H=${JSON.stringify(h)}\n  BTN=${JSON.stringify(btns)}\n  LINKS=${JSON.stringify(links)}\n  ERR=${JSON.stringify(errs.slice(0, 2))}`);
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });