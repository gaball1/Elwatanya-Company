/* eslint-disable */
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const reqs = [];
  page.on('request', (r) => { if (r.url().includes('/pdf/') || r.url().includes('/reporting/')) reqs.push(r.method() + ' ' + r.url()); });
  page.on('response', (r) => { if (r.url().includes('/pdf/') || r.url().includes('/reporting/')) console.log('[resp]', r.status(), r.url()); });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 500)));
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('[console.error]', msg.text().slice(0, 300)); });
  page.on('requestfailed', (r) => console.log('[requestfailed]', r.url(), r.failure()?.errorText));

  await page.goto(BASE + '/ar/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('input[name="email"]', 'admin@elwataniya.com').catch(async () => { await page.fill('input[type="email"]', 'admin@elwataniya.com'); });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[type="password"]').first().fill('Admin@123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/(\/(ar|en)\/admin)/, { timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('-- logged in', page.url());

  // Go to attendance history which has exportPDF
  await page.goto(BASE + '/ar/attendance/history', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  // Find the PDF print button
  const btns = await page.locator('button').allTextContents();
  console.log('-- buttons:', JSON.stringify(btns.slice(0, 30)));
  const pdfBtn = page.locator('button', { hasText: /PDF|طباعة|Pdf/i }).first();
  if (await pdfBtn.count()) {
    console.log('found pdf button, clicking...');
    const dlPromise = page.waitForEvent('download', { timeout: 15000 }).catch((e) => ({ failed: e.message }));
    await pdfBtn.click().catch((e) => console.log('[click err]', e.message));
    const dl = await dlPromise;
    console.log('download event:', dl && dl.failure ? 'failed ' + dl.failure().errorText : (dl && dl.suggestedFilename ? 'OK ' + dl.suggestedFilename : 'none'));
    await page.waitForTimeout(3000);
  } else {
    console.log('no PDF button found on attendance/history');
  }

  // Try employees page print PDF
  await page.goto(BASE + '/ar/employees', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const empButtons = await page.locator('button').allTextContents();
  console.log('-- employees buttons:', JSON.stringify(empButtons.slice(0, 20)));
  const printBtn = page.locator('button', { hasText: /PDF|طباعة/i }).first();
  if (await printBtn.count()) {
    console.log('clicking print on employees');
    await printBtn.click().catch((e) => console.log('[clkn err]', e.message));
    await page.waitForTimeout(6000);
  }

  console.log('-- captured requests:', JSON.stringify(reqs));
  await browser.close();
})();