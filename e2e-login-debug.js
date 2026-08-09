const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', m => { logs.push(`[console:${m.type()}] ${m.text().slice(0, 200)}`); });
  page.on('pageerror', e => logs.push(`[pageerror] ${String(e).slice(0, 200)}`));
  page.on('response', r => { if (r.url().includes('/api/') || r.url().includes('3001')) logs.push(`[${r.status()}] ${r.url().slice(0, 160)}`); });

  await page.goto('http://localhost:3000/ar/login', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.waitForSelector('#email', { timeout: 30000 }).catch(() => {});
  console.log('LOGIN PAGE TITLE:', await page.title().catch(()=>'n/a'));
  console.log('HAS EMAIL:', await page.locator('#email').count());
  console.log('HAS PASSWORD:', await page.locator('#password').count());
  console.log('SUB MIT:', await page.locator('button[type="submit"]').count());
  await page.fill('#email', 'admin@elwataniya.com');
  await page.fill('#password', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(6000);
  console.log('URL AFTER SUBMIT:', page.url());
  const body = await page.evaluate(() => document.body.innerText.slice(0, 500)).catch(()=>'ERR');
  console.log('BODY SNIPPET:', JSON.stringify(body.slice(0, 300)));
  console.log('LOGS:'); logs.slice(-30).forEach(l => console.log('  ' + l));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });