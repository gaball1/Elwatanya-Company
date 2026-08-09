const { chromium } = require('playwright');
const { db, dbFirst, wait } = require('./e2e-lib');
const BASE = 'http://localhost:3000';
const uid = () => require('crypto').randomUUID();

(async () => {
  const pid = uid();
  const fid = uid();
  // seed throwaway project + EMPTY fund (0 balance, like the harness part1 does)
  await db(`INSERT INTO "Project"(id,"name","code","client","location","status","progress","createdAt","updatedAt") VALUES ('${pid}','PUZ-Project','PUZ','PUZ Client','Cairo','ACTIVE',5,now(),now());`);
  await db(`INSERT INTO "ProjectFund"(id,"projectId","initialBalance","currentBalance","createdAt","updatedAt") VALUES ('${fid}','${pid}',0,0,now(),now());`);

  const browserObj = await chromium.launch({ headless: true });
  const page = await (await browserObj.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200)); });
  page.on('request', (r) => { if (r.url().includes('/api/v1')) console.log('[req]', r.method(), r.url().replace(BASE, '')); });
  page.on('response', async (r) => { if (r.url().includes('/purchases')) console.log('[resp]', r.status(), r.url().replace(BASE, '')); });

  await page.goto(`${BASE}/ar/login`, { waitUntil: 'domcontentloaded' });
  await wait(2000);
  await page.fill('#email', 'admin@elwataniya.com');
  await page.fill('#password', 'Admin@123');
  await page.click('button[type="submit"]');
  await wait(4000);

  await page.goto(`${BASE}/ar/treasury`, { waitUntil: 'domcontentloaded' });
  await wait(2000);
  // drill to the throwaway project's treasury tab via UI to add balance
  await page.goto(`${BASE}/ar/projects/${pid}/treasury`, { waitUntil: 'domcontentloaded' });
  await wait(2500);
  const ab = page.locator('button', { hasText: 'إضافة رصيد' }).first();
  await ab.waitFor({ state: 'visible', timeout: 20000 });
  await ab.click();
  await wait(800);
  await page.locator('input[name="amount"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.fill('input[name="amount"]', '50000');
  await page.fill('input[name="description"]', 'Harness-opening');
  await page.locator('form button[type="submit"]').click();
  await wait(3500);
  const balAfterAdd = await db(`SELECT "currentBalance" FROM "ProjectFund" WHERE id='${fid}';`);
  console.log('fund balance after treasury add:', balAfterAdd);

  await page.goto(`${BASE}/ar/projects/${pid}/purchases`, { waitUntil: 'domcontentloaded' });
  await wait(3000);
  const addP = page.locator('button', { hasText: 'إضافة مشتريات' }).first();
  await addP.waitFor({ state: 'visible', timeout: 20000 });
  await addP.click();
  await wait(900);
  const f = page.locator('form').filter({ has: page.locator('input[type="file"]') });
  await f.locator('input[type="text"]').nth(0).waitFor({ state: 'visible', timeout: 15000 });
  await f.locator('input[type="text"]').nth(0).fill('Cement PUZ');
  await f.locator('input[type="number"]').nth(0).fill('10');
  await f.locator('input[type="text"]').nth(1).fill('bag');
  await f.locator('input[type="number"]').nth(1).fill('300');
  await f.locator('input[type="file"]').setInputFiles({ name: 'inv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test invoice') });
  await wait(600);
  const disabled = await f.locator('button[type="submit"]').isDisabled().catch(() => false);
  console.log('submit disabled?', disabled);
  await f.locator('button[type="submit"]').click();
  await wait(5000);
  const dbCount = dbFirst(`SELECT count(*) FROM "Purchase" WHERE "projectId"='${pid}';`);
  console.log('DB purchase count:', dbCount);
  if (Number(dbCount) > 0) {
    const row = await db(`SELECT "itemName","quantity","unit","unitPrice","createdBy" FROM "Purchase" WHERE "projectId"='${pid}' LIMIT 1;`);
    console.log('purchase row:', row);
  }
  const fundBal = await db(`SELECT "currentBalance" FROM "ProjectFund" WHERE "projectId"='${pid}';`);
  console.log('fund bal after:', fundBal);
  const body = await page.locator('body').innerText().catch(() => '');
  for (const kw of ['فشل', 'غير كافٍ', 'تم إضافة', 'إلزامي', 'error']) {
    if (body.includes(kw)) console.log('BODY contains:', kw);
  }
  // cleanup
  await db(`DELETE FROM "FundTransaction" WHERE "fundId"='${fid}';`);
  await db(`DELETE FROM "Purchase" WHERE "projectId"='${pid}';`);
  await db(`DELETE FROM "Approval" WHERE "entityType"='purchase' AND "entityId" LIKE '%${pid}%';`);
  await db(`DELETE FROM "InventoryItem" WHERE "name" LIKE '%Probe%' OR "name" LIKE '%PUZ%';`);
  await db(`DELETE FROM "ProjectFund" WHERE id='${fid}';`);
  await db(`DELETE FROM "Building" WHERE "projectId"='${pid}';`);
  await db(`DELETE FROM "Project" WHERE id='${pid}';`);
  console.log('cleaned');
  await browserObj.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });