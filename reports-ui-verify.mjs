import { chromium } from 'playwright';

const base = 'http://localhost:3000';
const api = 'http://localhost:3001/api/v1';

const loginJson = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = loginJson?.data?.accessToken;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const events = [];
page.on('response', (r) => {
  if (r.url().includes('/reporting/')) events.push(`[resp] ${r.status()} ${new URL(r.url()).pathname}${r.url().includes('format=') ? '?' + r.url().split('?')[1] : ''}`);
});
page.on('pageerror', (e) => events.push(`[pageerror] ${String(e).slice(0, 200)}`));
page.on('console', (m) => { if (m.type() === 'error') events.push(`[console.error] ${m.text().slice(0, 200)}`); });

await page.goto(base + '/ar/logout', { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => {
  localStorage.setItem('elwataniya_access_token', t);
  document.cookie = `elwataniya_token=${t};path=/;SameSite=Lax;max-age=604800`;
}, token);

await page.goto(base + '/ar/reports', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(4000);

const reportCards = await page.locator('h3').allTextContents();
events.push('report cards: ' + JSON.stringify(reportCards));

// Click the Preview button on the first report card and inspect the dialog
const previewBtn = page.locator('button', { hasText: /معاينة|Preview/ }).first();
if (await previewBtn.count()) {
  events.push('clicking preview on: ' + reportCards[0]);
  await previewBtn.click();
  await page.waitForTimeout(3500);
  const dialogHtml = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"], .fixed.inset-0');
    return dlg ? dlg.innerHTML.slice(0, 600) : '(no dialog)';
  });
  events.push('preview dialog snippet: ' + dialogHtml.replace(/\n/g, ' ').slice(0, 400));
  const hasGarbledPdf = await page.evaluate(() => /%PDF|\\x|�{2,}/.test(document.body.innerText));
  events.push('dialog shows PDF garbage: ' + hasGarbledPdf);
  // close dialog
  await page.keyboard.press('Escape').catch(() => {});
}

await page.waitForTimeout(500);

// Click a download (PDF) button
const dlBtns = page.locator('button', { hasText: /PDF/i });
events.push('PDF buttons: ' + (await dlBtns.count()));
if (await dlBtns.count()) {
  const dl = page.waitForEvent('download', { timeout: 20000 }).catch((e) => ({ noDownload: e.message }));
  await dlBtns.first().click().catch((e) => events.push('[click err] ' + e.message.slice(0, 120)));
  const res = await dl;
  events.push('download result: ' + JSON.stringify(res.suggestedFilename ? { ok: true, file: res.suggestedFilename, bytes: (await res.suggestedFilename) } : { failed: res.directDownload ? res.directDownload : res }));
  if (res.suggestedFilename) { const path = await res.path(); const fs = (await import('fs')); events.push('download path: ' + path); }
}

await page.waitForTimeout(3000);
events.push('captured network: ' + JSON.stringify(events.filter((e) => e.includes('resp')), null, 1));

console.log(events.join('\n'));
await browser.close();