const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/ar/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#email', 'admin@elwataniya.com');
  await page.fill('#password', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  await page.goto('http://localhost:3000/ar/admin', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2500);

  const targets = [];
  for (const qa of ['مشروع جديد', 'مقاول جديد', 'مستخلص جديد', 'حركة مخزون']) {
    const btn = page.locator('a', { hasText: qa }).first();
    const href = await btn.getAttribute('href').catch(() => null);
    const inView = await btn.isVisible().catch(() => false);
    targets.push({ qa, href, inView });
  }
  console.log('QUICK ACTIONS:', JSON.stringify(targets, null, 1));

  const results = [];
  for (const t of targets) {
    const btn = page.locator('a', { hasText: t.qa }).first();
    if (t.href) {
      await btn.click();
      await page.waitForTimeout(2200);
      const is404 = (await page.evaluate(() => document.body.innerText)).includes('This page could not be found');
      results.push({ qa: t.qa, href: t.href, status: is404 ? '404' : 'OK', url: page.url() });
      await page.goto('http://localhost:3000/ar/admin', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2200);
    } else {
      results.push({ qa: t.qa, href: null, status: 'NO-LINK' });
    }
  }
  console.log('CLICK TEST:', JSON.stringify(results, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });