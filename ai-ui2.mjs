import { chromium } from 'playwright';
const base = 'http://localhost:3000';
const api = 'http://localhost:3001/api/v1';
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@elwataniya.com', password: 'Admin@123' }) }).then((r) => r.json());
const token = login?.data?.accessToken;
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const out = [];
page.on('response', (r) => { if (r.url().includes('/ai-agent') && r.url().includes('/chat')) out.push('[chat] ' + r.status() + ' ' + (r.request().method())); });
await page.goto(base + '/ar/logout', { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => { localStorage.setItem('elwataniya_access_token', t); document.cookie = `elwataniya_token=${t};path=/;SameSite=Lax;max-age=604800`; }, token);
await page.goto(base + '/ar/projects', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(4000);

// open widget via DOM click
await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="فتح المساعد الذكي"]');
  if (b) b.click();
});
await page.waitForTimeout(1500);
const greeting = await page.evaluate(() => {
  const w = Array.from(document.querySelectorAll('div')).find((d) => typeof d.className === 'string' && d.className.includes('w-[420px]'));
  return w ? w.innerText.slice(0, 200) : '(none)';
});
out.push('widget: ' + JSON.stringify(greeting.replace(/\n/g, ' | ')));

// fill input + send via DOM events
await page.evaluate(() => {
  const input = document.querySelector('input[placeholder*="المشاريع"]');
  if (input) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'كم عدد مشاريع الشركة؟');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await page.keyboard.press('Enter');
out.push('sent; waiting for reply...');
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(2000);
  const typing = await page.locator('div.animate-bounce').count();
  const bubbles = await page.locator('div.whitespace-pre-wrap').allTextContents();
  if (!typing && bubbles.length >= 2) {
    out.push('reply len: ' + (bubbles[bubbles.length - 1] || '').length);
    out.push('reply sample: ' + (bubbles[bubbles.length - 1] || '').replace(/\n/g, ' ').slice(0, 140));
    break;
  }
}
const finalTyping = await page.locator('div.animate-bounce').count();
out.push('final typing shown: ' + finalTyping);
console.log(out.join('\n'));
await browser.close();