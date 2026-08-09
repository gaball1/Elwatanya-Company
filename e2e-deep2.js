const { chromium } = require('playwright');

const PROJECT = 'df50a993-0dee-4654-adb9-7249fe0fdaac';
const BUILDING = '91e1f2c1-76e8-460a-8373-4990f65f5142';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(8000);
  await page.goto('http://localhost:3000/ar/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#email', 'admin@elwataniya.com');
  await page.fill('#password', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  const ROUTES = [
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/estimates/company`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/estimates/final`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/subcontractors`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/statements`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/boards`,
    `/ar/projects/${PROJECT}/buildings/${BUILDING}/client-statements`,
    `/ar/projects/${PROJECT}/(tabs)/treasury`,
    `/ar/projects/${PROJECT}/(tabs)/purchases`,
    `/ar/projects/${PROJECT}/(tabs)/inventory`,
    `/ar/projects/${PROJECT}/(tabs)/miscellaneous`,
    `/ar/projects/${PROJECT}/(tabs)/analytics`,
  ];
  for (const route of ROUTES) {
    const errs = [];
    const h = await page.$$eval('h1,h2,h3', els => els.slice(0, 8).map(e => (e.textContent || '').trim().slice(0, 50)).filter(Boolean));
    console.log(`\n### ${route}\n  H=${JSON.stringify(h)}`);
    break; // don't navigate yet; this first pass only captured current page
  }
  for (const route of ROUTES) {
    const errs = [];
    const navErr = [];
    try {
      await page.goto('http://localhost:3000' + route, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e) { navErr.push(e.message.split('\n')[0].slice(0, 80)); }
    await page.waitForTimeout(1500);
    const is404 = (await page.evaluate(() => document.body.innerText)).includes('This page could not be found');
    const h = await page.$$eval('h1,h2,h3', els => els.slice(0, 8).map(e => (e.textContent || '').trim().slice(0, 50)).filter(Boolean));
    const btns = await page.$$eval('button', els => els.slice(0, 10).map(e => (e.textContent || '').trim().slice(0, 28)).filter(Boolean));
    const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
    console.log(`\n### ${route}\n  404=${is404} navErr=${JSON.stringify(navErr)}\n  H=${JSON.stringify(h)}\n  BTN=${JSON.stringify(btns)}\n  BODY=${body.replace(/\n+/g, ' | ')}`);
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });