import { chromium } from 'playwright';
const base = 'http://localhost:3000';
const api = 'http://localhost:3001/api/v1';
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = login?.data?.accessToken;
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const out = [];
page.on('response', (r) => { if (r.url().includes('/ai-agent')) out.push(`[${r.request().method()} ${r.status()}] ${r.url().replace('http://localhost:3001/api/v1', '')}`); });
await page.goto(base + '/ar/logout', { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => { localStorage.setItem('elwataniya_access_token', t); document.cookie = `elwataniya_token=${t};path=/;SameSite=Lax;max-age=604800`; }, token);
await page.goto(base + '/ar/projects', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3500);

const bot = page.locator('button[aria-label="فتح المساعد الذكي"]');
out.push('bot button count: ' + (await bot.count()));
await page.evaluate(() => document.querySelector('nextjs-portal')?.remove());
await page.waitForTimeout(800);
await bot.first().click();
await page.waitForTimeout(1200);
const title = await page.locator('h3', { hasText: /المساعد/ }).first().textContent().catch(() => '(none)');
out.push('widget title: ' + title);
const suggestions = await page.locator('button', { hasText: /إنشاء مشروع|الموافقات|المقاولين|مقايسة/ }).allTextContents();
out.push('suggestions: ' + JSON.stringify(suggestions));
const input = page.locator('input[placeholder*="المشاريع"]').first();
out.push('input count: ' + (await input.count()));
await input.fill('ما هي الموافقات المعلقة حالياً؟');
await page.keyboard.press('Enter');
out.push('waiting for typing indicator...');
await page.waitForTimeout(8000);
const msgBubbles = await page.locator('div.whitespace-pre-wrap').allTextContents();
const last = msgBubbles.length ? msgBubbles[msgBubbles.length - 1] : '(none)';
out.push('last assistant msg len: ' + last.length);
out.push('assistant msg sample: ' + last.slice(0, 120).replace(/\n/g, ' '));
out.push('typing still shown: ' + (await page.locator('div.animate-bounce').count() > 0));

// open history view
await page.locator('button[aria-label="المحادثات"]').click().catch(() => {});
await page.waitForTimeout(2500);
const historyItems = await page.locator('div.divide-y > div').count();
out.push('history conversations: ' + historyItems);

console.log(out.join('\n'));
await browser.close();