const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200)); });
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)));

  const BASE = 'http://localhost:3000';
  const loginUrl = BASE + '/ar/login';
  console.log('goto', loginUrl);
  await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('URL after goto:', page.url());
  console.log('TITLE:', await page.title());

  // dump inputs
  const inputs = await page.$$eval('input', els => els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder, id: e.id })));
  console.log('INPUTS:', JSON.stringify(inputs, null, 1));

  const buttons = await page.$$eval('button', els => els.map(e => ({ text: (e.textContent || '').trim().slice(0, 40), type: e.type })));
  console.log('BUTTONS:', JSON.stringify(buttons));

  const h1s = await page.$$eval('h1,h2', els => els.map(e => (e.textContent || '').trim()));
  console.log('HEADINGS:', JSON.stringify(h1s));

  // try login
  const emailSel = 'input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="بريد"]';
  const passSel = 'input[type="password"]';
  await page.fill(emailSel, 'admin@elwataniya.com').catch(() => console.log('email fill failed'));
  await page.fill(passSel, 'Admin@123').catch(() => console.log('pass fill failed'));
  await page.click('button[type="submit"], button:has-text("تسجيل"), button:has-text("دخول"), button:has-text("Login")').catch(() => console.log('login click failed'));
  await page.waitForTimeout(5000);
  console.log('URL after login attempt:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1200));
  console.log('BODY SAMPLE:', bodyText);

  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
