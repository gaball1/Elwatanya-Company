import { chromium } from 'playwright';

const base = 'http://localhost:3000';
const api = 'http://localhost:3001/api/v1';
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = login?.data?.accessToken;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const out = [];
const respLog = [];
page.on('response', (r) => { if (r.url().includes('/notifications') && r.url().includes('/api/v1')) respLog.push(`[${r.request().method()} ${r.status()}] ${r.url().replace('http://localhost:3001/api/v1', '')}`); });

const seed = async () => {
  await page.goto(base + '/ar/logout', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('elwataniya_access_token', t);
    document.cookie = `elwataniya_token=${t};path=/;SameSite=Lax;max-age=604800`;
  }, token);
};

await seed();
await page.goto(base + '/ar/notifications', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3500);

out.push('AR title: ' + (await page.locator('h1').first().textContent()));
const tabs = await page.locator('button', { hasText: /الكل|غير مقروء/ }).allTextContents();
out.push('AR tabs: ' + JSON.stringify(tabs));
const hasMarkAll = await page.locator('button', { hasText: /تحديد الكل كمقروء/ }).count();
out.push('has mark-all AR: ' + hasMarkAll);
const hasAdd = await page.locator('button', { hasText: /إضافة إشعار/ }).count();
out.push('has add AR: ' + hasAdd);

// create via modal
await page.locator('button', { hasText: /إضافة إشعار/ }).click();
await page.waitForTimeout(500);
await page.locator('input[name="title"]').fill('QA UI الإشعار التجريبي');
await page.locator('textarea[name="message"]').fill('رسالة تجريبية من QA UI');
await page.locator('input[name="titleEn"]').fill('QA UI Test Notification');
await page.locator('textarea[name="messageEn"]').fill('Probe message from QA UI');
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(2000);
const createdVisible = await page.getByText('QA UI الإشعار التجريبي').count();
out.push('created visible in list: ' + createdVisible);

// mark this one as read
const readBtn = page.locator('button', { hasText: /^تحديد كمقروء/ }).first();
if (await readBtn.count()) {
  await readBtn.click();
  await page.waitForTimeout(1500);
  out.push('after mark-read, first "تحديد كمقروء" count: ' + (await page.locator('button', { hasText: /^تحديد كمقروء/ }).count()));
}

// filter to unread tab
await page.locator('button', { hasText: /غير مقروء/ }).click();
await page.waitForTimeout(1500);
out.push('unread tab shows item (probe visible): ' + (await page.getByText('QA UI الإشعار التجريبي').count()));

// mark all read (if any unread remain)
if (await page.locator('button', { hasText: /تحديد الكل كمقروء/ }).count()) {
  await page.locator('button', { hasText: /تحديد الكل كمقروء/ }).click();
  await page.waitForTimeout(1500);
  out.push('mark-all clicked, unread tab now: ' + (await page.getByText('QA UI الإشعار التجريبي').count()));
}

// delete the probe
const probeCard = page.locator('div', { hasText: 'QA UI الإشعار التجريبي' }).first();
if (await probeCard.count()) {
  const del = probeCard.locator('button').last();
  if (await del.count()) {
    await del.click();
    await page.waitForTimeout(1500);
    out.push('deleted probe, visible now: ' + (await page.getByText('QA UI الإشعار التجريبي').count()));
  }
}

// English parity
await page.goto(base + '/en/notifications', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3000);
out.push('EN title: ' + (await page.locator('h1').first().textContent()));
const enTabs = await page.locator('button', { hasText: /All|Unread/ }).allTextContents();
out.push('EN tabs: ' + JSON.stringify(enTabs));

// Topbar dropdown + click navigation (go back to AR dashboard)
await seed();
await page.goto(base + '/ar', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3500);
await page.locator('header button[aria-label]').first().click().catch(() => {});
// open bell: find bell button
const bell = page.locator('header button').filter({ has: page.locator('svg.lucide-bell') });
const bellCount = await bell.count();
out.push('bell buttons: ' + bellCount);
if (bellCount) {
  await bell.first().click();
  await page.waitForTimeout(1500);
  const dropdownText = await page.locator('div.shadow-dropdown, div.animate-fade-in-down').last().innerText().catch(() => '(none)');
  out.push('dropdown contains "عرض الكل": ' + dropdownText.includes('عرض الكل'));
  await page.getByText('عرض الكل').click().catch(() => {});
  await page.waitForTimeout(2500);
  out.push('navigated after view-all, path: ' + page.url());
}

out.push('NOTIF API CALLS: ' + JSON.stringify(respLog));
console.log(out.join('\n'));
await browser.close();