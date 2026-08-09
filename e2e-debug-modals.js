/* eslint-disable */
const { chromium } = require('playwright');
const { dbFirst, wait, q, db } = require('./e2e-lib');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200)); });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));

  // login
  await page.goto(`${BASE}/ar/login`, { waitUntil: 'domcontentloaded' });
  await wait(2000);
  await page.fill('#email', 'admin@elwataniya.com');
  await page.fill('#password', 'Admin@123');
  await page.click('button[type="submit"]');
  await wait(4000);
  console.log('LOGIN URL:', page.url());

  // is there test data? if not, quick-create via DB reuse existing real ones
  let row = db(`SELECT p.id pid, b.id bid, s.id sid FROM "Project" p LEFT JOIN "Building" b ON b."projectId"=p.id LEFT JOIN "BuildingSubcontractor" bs ON bs."buildingId"=b.id LEFT JOIN "Subcontractor" s ON s.id=bs."subcontractorId" WHERE p.name LIKE '%انشاء شركة وطنية%' AND b.id IS NOT NULL LIMIT 1;`);
  console.log('ROW:', row);
  // use real known project even if linking missing
  const projectId = 'df50a993-0dee-4654-adb9-7249fe0fdaac';
  const buildingId = '91e1f2c1-76e8-460a-8373-4990f65f5142';
  const subId = 'f62a4ee7-11f4-4c14-8eb2-e68f3b3b520b';

  // ---- probe ASSIGN page ----
  console.log('\n===== ASSIGN page probe =====');
  await page.goto(`${BASE}/ar/projects/${projectId}/buildings/${buildingId}/subcontractors`, { waitUntil: 'domcontentloaded' });
  await wait(2500);
  const btnCount = await page.locator('button', { hasText: 'تعيين مقاول' }).count();
  console.log('"تعيين مقاول" button count:', btnCount);
  // try clicking the one WITHOUT text modifier (strict count)
  if (btnCount > 0) {
    await page.getByRole('button', { name: 'تعيين مقاول', exact: false }).first().click();
    await wait(1200);
    const selCount = await page.locator('select').count();
    console.log('select count after click:', selCount);
    if (selCount > 0) {
      for (let i = 0; i < selCount; i++) {
        const firstOpt = await page.locator('select').nth(i).locator('option').first().textContent();
        console.log(`  select#${i} label? firstOpt text:`, firstOpt);
        const html = await page.locator('select').nth(i).evaluate((n) => n.outerHTML.slice(0, 300));
        console.log(`  select#${i} html:`, html);
      }
      // count options inside modal and check sub present
      const opts = await page.locator('select option').allTextContents();
      console.log('all options:', JSON.stringify(opts.slice(0, 10)));
    } else {
      console.log('NO select after click. Page snippet:');
      const body = await page.locator('body').innerText().catch(() => '');
      console.log(body.slice(0, 600));
    }
  } else {
    console.log('assign button NOT found — page content:');
    const body = await page.locator('body').innerText().catch(() => '');
    console.log(body.slice(0, 800));
  }

  // ---- probe TREASURY ----
  console.log('\n===== TREASURY probe =====');
  await page.goto(`${BASE}/ar/projects/${projectId}/treasury`, { waitUntil: 'domcontentloaded' });
  await wait(2500);
  console.log('URL:', page.url());
  const addBalCount = await page.locator('button', { hasText: 'إضافة رصيد' }).count();
  console.log('"إضافة رصيد" buttons:', addBalCount);
  const ftrs = await page.locator('button').allTextContents().then((t) => t.filter((x) => x.trim().length));
  console.log('all buttons:', JSON.stringify(ftrs.slice(0, 30)));
  if (addBalCount > 0) {
    await page.locator('button', { hasText: 'إضافة رصيد' }).first().click();
    await wait(1200);
    const amountCount = await page.locator('input[name="amount"]').count();
    console.log('amount input count:', amountCount);
    const descCount = await page.locator('input[name="description"]').count();
    console.log('description count:', descCount);
    const sels = await page.locator('select').count();
    console.log('select count:', sels);
    // is there a fund behind this project?
    const fund = await db(`SELECT id FROM "ProjectFund" WHERE "projectId"='${projectId}' LIMIT 1;`);
    console.log('project fund row:', fund);
    await page.fill('input[name="amount"]', '7777');
    await page.fill('input[name="description"]', 'Probe add balance');
    await page.locator('form button[type="submit"]').click();
    await wait(4000);
    const tx = await db(`SELECT fx.type, fx.status, fx.amount FROM "FundTransaction" fx JOIN "ProjectFund" f ON f.id=fx."fundId" WHERE f."projectId"='${projectId}' AND fx."description"='Probe add balance' ORDER BY fx."createdAt" DESC LIMIT 1;`);
    console.log('TXN after submit:', tx);
    const bal = await db(`SELECT "currentBalance" FROM "ProjectFund" WHERE "projectId"='${projectId}' ORDER BY "updatedAt" DESC LIMIT 1;`);
    console.log('fund balance now:', bal);
    // find the approval for this pending transaction and approve via UI
    const appr = await db(`SELECT a.id, a."entityType", a.status FROM "Approval" a WHERE a.status='pending' ORDER BY a."createdAt" DESC LIMIT 5;`);
    console.log('pending approvals:', appr);
    const fx = await db(`SELECT fx.id FROM "FundTransaction" fx JOIN "ProjectFund" f ON f.id=fx."fundId" WHERE f."projectId"='${projectId}' AND fx."description"='Probe add balance' ORDER BY fx."createdAt" DESC LIMIT 1;`);
    console.log('created fx id:', fx);
    // try approving via API
    try {
      const res = await page.evaluate(async (aid) => {
        const r = await fetch('/api/v1/approvals/' + aid + '/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'probe approve' }) });
        return r.status + ' ' + (await r.text()).slice(0, 200);
      }, appr ? appr.split('|')[0] : null);
      console.log('approve API result:', res);
    } catch (e2) { console.log('approve API error:', e2.message); }
    await wait(1500);
    const bal2 = await db(`SELECT "currentBalance" FROM "ProjectFund" WHERE "projectId"='${projectId}' ORDER BY "updatedAt" DESC LIMIT 1;`);
    console.log('fund balance AFTER approve:', bal2);
    const tx2 = await db(`SELECT fx.type, fx.status FROM "FundTransaction" fx JOIN "ProjectFund" f ON f.id=fx."fundId" WHERE f."projectId"='${projectId}' AND fx."description"='Probe add balance' ORDER BY fx."createdAt" DESC LIMIT 1;`);
    console.log('fx status AFTER approve:', tx2);
    await db(`DELETE FROM "FundTransaction" fx USING "ProjectFund" f WHERE f.id=fx."fundId" AND f."projectId"='${projectId}' AND fx."description"='Probe add balance';`);
  }

  // ---- probe PURCHASES ----
  console.log('\n===== PURCHASES probe =====');
  await page.goto(`${BASE}/ar/projects/${projectId}/purchases`, { waitUntil: 'domcontentloaded' });
  await wait(2500);
  console.log('URL:', page.url());
  const addP = await page.locator('button', { hasText: 'إضافة مشتريات' }).count();
  console.log('"إضافة مشتريات" buttons:', addP);
  console.log('all purchase buttons:', JSON.stringify(await page.locator('button').allTextContents().then((t) => t.filter((x) => x.trim()).slice(0, 40))));
  const addP3 = await page.locator('button', { hasText: 'إضافة مشتريات' }).count();
  console.log('"إضافة مشتريات" buttons FINAL:', addP3);
  // re-check after longer wait for <Can> async permission resolution
  await wait(4000);
  const addP2 = await page.locator('button', { hasText: 'إضافة مشتريات' }).count();
  console.log('"إضافة مشتريات" buttons AFTER 4s wait:', addP2);
  if (addP2 > 0) {
    await page.locator('button', { hasText: 'إضافة مشتريات' }).first().click();
    await wait(1000);
    const forms = await page.locator('form').count();
    console.log('form count:', forms);
    const inputsT = await page.locator('form input[type="text"]').count();
    const inputsN = await page.locator('form input[type="number"]').count();
    console.log('form text inputs:', inputsT, 'number inputs:', inputsN);
    const fileCount = await page.locator('form input[type="file"]').count();
    console.log('file inputs (in form):', fileCount);
    // capture toasts + network requests to fund project
    const toasts = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text().slice(0, 300)); });
    page.on('request', (r) => { if (r.url().includes('/api/v1')) console.log('[req]', r.method(), r.url()); });
    page.on('response', async (r) => { if (r.url().includes('/purchases')) console.log('[resp]', r.status(), r.url()); });
    const sf = page.locator('form').filter({ has: page.locator('input[type="file"]') });
    console.log('purchase form (with file) count:', await sf.count());
    if (await sf.count()) {
      const f = sf.first();
      await f.locator('input[type="text"]').nth(0).fill('Cement ProbeXY');
      await f.locator('input[type="number"]').nth(0).fill('5');
      await f.locator('input[type="text"]').nth(1).fill('bag');
      await f.locator('input[type="number"]').nth(1).fill('100');
      await f.locator('input[type="file"]').setInputFiles({ name: 'inv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test invoice') });
      await wait(600);
      const btnT = await f.locator('button[type="submit"]').allTextContents();
      console.log('submit button:', JSON.stringify(btnT));
      await f.locator('button[type="submit"]').click();
      await wait(4500);
      const created = await db(`SELECT count(*) FROM "Purchase" WHERE "itemName" ILIKE '%Cement ProbeXY%';`);
      console.log('created purchase count (DB):', created);
      await db(`DELETE FROM "Purchase" WHERE "itemName" ILIKE '%Cement ProbeXY%';`);
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const toastIdx = bodyText.indexOf('فشل');
      console.log('failed-toast present:', toastIdx !== -1 ? bodyText.slice(Math.max(0, toastIdx - 40), toastIdx + 80) : 'none');
    } else {
      console.log('form with file NOT found; forms =', forms, 'file inputs anywhere =', fileCount);
    }
  }

  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });