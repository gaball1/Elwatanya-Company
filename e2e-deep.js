const { chromium } = require('playwright');

const PROJECT = 'df50a993-0dee-4654-adb9-7249fe0fdaac'; // NCM-2026
const BUILDING = '91e1f2c1-76e8-460a-8373-4990f65f5142';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/ar/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#email', 'admin@elwataniya.com');
  await page.fill('#password', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  const ROUTES = [
    `/ar/projects/${PROJECT}`,
    `/ar/projects/${PROJECT}/buildings`,
    `/ar/projects/${PROJECT}/(tabs)/buildings`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/estimates`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/estimates/client`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/estimates/company`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/estimates/final`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/measures`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/surveying`,
    `/ar/projects/${PROJECT}/subcontracts`,
    `/ar/projects/${BUILDING}`,
  ];
  for (const route of ROUTES) {
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
    page.on('console', m => { if (m.type() === 'error') errs.push('[c]' + m.text().slice(0, 110)); });
    let url;
    try { await page.goto('http://localhost:3000' + route, { waitUntil: 'domcontentloaded', timeout: 20000 }); url = page.url().replace('http://localhost:3000', ''); }
    catch (e) { url = 'NAV-ERR:' + e.message.split('\n')[0].slice(0, 90); }
    await page.waitForTimeout(900);
    const is404 = (await page.evaluate(() => document.body.innerText)).includes('This page could not be found');
    const h = await page.$$eval('h1,h2,h3', els => els.slice(0, 8).map(e => (e.textContent || '').trim().slice(0, 50)).filter(Boolean));
    const btns = await page.$$eval('button', els => els.slice(0, 14).map(e => (e.textContent || '').trim().slice(0, 30)).filter(Boolean));
    const inputs = await page.$$eval('input,select,textarea', els => els.length);
    console.log(`\n### ${route}\n  url=${url}\n  404=${is404} inputs=${inputs}\n  H=${JSON.stringify(h)}\n  BTN=${JSON.stringify(btns)}\n  ERR=${JSON.stringify(errs.slice(0, 2))}`);
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });