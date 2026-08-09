/* eslint-disable */
/**
 * elwataniya ERP — Final Product Acceptance harness part 1 (auth, projects, buildings, BOQ, subcontractors).
 * Run: node e2e-acceptance.js
 */
const { chromium } = require('playwright');
const { record, dbFirst, wait, q } = require('./e2e-lib');
/* eslint-disable */

const BASE = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@elwataniya.com';
const ADMIN_PASS = 'Admin@123';
const ACC = 'ACC-' + Date.now().toString(36).toUpperCase();

// state shared with part2/cleanup via global
global.ACC = ACC;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const nav = async (route, opts = {}) => {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000, ...opts });
    await wait(opts.wait || 2500);
  };

  const projName = 'Acceptance ' + ACC;
  const code = 'AC' + ACC.slice(4, 11).replace(/[^A-Z0-9]/g, 'X');
  let projectId = null, buildingId = null, subId = null;

  // ---------- 1. LOGIN ----------
  try {
    await page.goto(BASE + '/ar/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#email', { timeout: 20000 });
    await wait(1200);
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASS);
    await Promise.all([
      page.waitForURL('**/ar/admin**', { timeout: 25000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    await wait(4000);
    record('LOGIN: admin authenticates and redirects to dashboard', page.url().includes('/ar/admin'), 'url=' + page.url());
  } catch (e) {
    record('LOGIN: admin', false, e.message);
  }

  // ---------- 2. PROJECT CREATE ----------
  try {
    await nav('/ar/projects');
    await page.click('text=إضافة مشروع');
    await wait(900);
    await page.fill('input[name="code"]', code);
    await page.fill('input[name="name"]', projName);
    await page.fill('input[name="client"]', 'Test Client');
    await page.fill('input[name="location"]', 'Cairo');
    await page.fill('textarea[name="description"]', 'Final acceptance project');
    await page.fill('input[name="startDate"]', '2026-08-01');
    await page.fill('input[name="progress"]', '10');
    await page.click('form button[type="submit"]');
    await wait(4000);
    const dbRow = dbFirst(`SELECT id FROM "Project" WHERE name=${q(projName)} LIMIT 1;`);
    if (dbRow && /^[0-9a-f-]{36}$/i.test(dbRow)) projectId = dbRow;
    record('PROJECT CREATE: modal persisted project in DB', projectId !== null, 'id=' + (projectId || 'none'));
    const seen = await page.evaluate((n) => document.body.innerText.includes(n), projName).catch(() => false);
    record('PROJECT CREATE: appears in UI list', seen, 'listed');
  } catch (e) {
    record('PROJECT CREATE: via UI', false, e.message);
  }

  // ---------- 3. BUILDING CREATE ----------
  const buildingName = 'Building ' + ACC;
  if (projectId) {
    try {
      await nav(`/ar/projects/${projectId}/buildings`);
      await page.click('text=إضافة مبنى');
      await wait(900);
      await page.fill('input[name="name"]', buildingName);
      await page.fill('input[name="code"]', 'B-ACC');
      await page.selectOption('select[name="type"]', 'تجاري');
      await page.fill('input[name="startDate"]', '2026-08-01');
      await page.fill('textarea[name="description"]', 'Test building');
      await page.click('form button[type="submit"]');
      await wait(4000);
      const bRow = dbFirst(`SELECT id FROM "Building" WHERE name=${q(buildingName)} AND "projectId"=${q(projectId)} LIMIT 1;`);
      if (bRow && /^[0-9a-f-]{36}$/i.test(bRow)) buildingId = bRow;
      record('BUILDING CREATE: persisted building to DB', buildingId !== null, 'id=' + (buildingId || 'none'));
    } catch (e) {
      record('BUILDING CREATE: via UI', false, e.message);
    }
  }

  // ---------- 4. EMPLOYER BOQ ----------
  if (buildingId) {
    try {
      await nav(`/ar/projects/${projectId}/buildings/${buildingId}/estimates/client`);
      await page.locator('button', { hasText: 'إضافة بند' }).first().click();
      await wait(900);
      await page.fill('input[placeholder="الوصف"]', 'Employer item ' + ACC);
      await page.fill('input[placeholder="وحدة"]', 'm3');
      await page.fill('input[placeholder="كمية"]', '100');
      await page.fill('input[placeholder="فئة"]', '500');
      await page.click('form button[type="submit"]');
      await wait(3500);
      const cnt = dbFirst(`SELECT count(*) FROM "EmployerBoqItem" WHERE "buildingId"=${q(buildingId)};`);
      record('EMPLOYER BOQ: item added via UI', Number(cnt) >= 1, 'count=' + cnt);
    } catch (e) {
      record('EMPLOYER BOQ: add item', false, e.message);
    }
  }

  // ---------- 5. SUBCONTRACTOR CREATE ----------
  const subName = 'Sub ' + ACC;
  try {
    await nav('/ar/subcontractors');
    const addBtn = page.locator('button', { hasText: 'إضافة مقاول' }).first();
    if (await addBtn.count()) await addBtn.click();
    else await page.click('text=إضافة مقاول');
    await wait(900);
    await page.fill('input[name="name"]', subName);
    await page.fill('input[name="phone"]', '01000000000');
    await page.selectOption('select[name="workType"]', 'حداد');
    await page.fill('input[name="marginValue"]', '5');
    await page.click('form button[type="submit"]');
    await wait(3500);
    const sRow = dbFirst(`SELECT id FROM "Subcontractor" WHERE name=${q(subName)} ORDER BY "createdAt" DESC LIMIT 1;`);
    if (sRow && /^[0-9a-f-]{36}$/i.test(sRow)) subId = sRow;
    record('SUBCONTRACTOR CREATE: persisted in DB', subId !== null, 'id=' + (subId || 'none'));
  } catch (e) {
    record('SUBCONTRACTOR CREATE', false, e.message);
  }

  // ---------- 6. ASSIGN SUBCONTRACTOR ----------
  if (buildingId && subId) {
    try {
      await nav(`/ar/projects/${projectId}/buildings/${buildingId}/subcontractors`);
      await wait(2500);
      const openBtn = page.locator('button', { hasText: 'تعيين مقاول' }).first();
      await openBtn.waitFor({ state: 'visible', timeout: 15000 });
      await openBtn.click();
      await page.locator('select').waitFor({ state: 'visible', timeout: 15000 });
      await page.locator('select').first().selectOption(subId);
      await wait(400);
      await page.locator('form').first().locator('button[type="submit"]').click();
      await wait(4000);
      const cnt = dbFirst(`SELECT count(*) FROM "BuildingSubcontractor" WHERE "buildingId"=${q(buildingId)} AND "subcontractorId"=${q(subId)};`);
      record('ASSIGN: subcontractor linked to building in DB', Number(cnt) === 1, 'db=' + cnt);
    } catch (e) {
      record('ASSIGN: subcontractor to building', false, e.message);
    }
  }

  // ---------- 7..N : treasury, purchases, inventory, reports, RTL, cleanup (part2)
  const p2 = require('./e2e-acceptance2.js');
  await p2.part2({ page, nav, ACC, projectId, buildingId, subId });

  await require('./e2e-lib').summary();
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });