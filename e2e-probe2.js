const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/ar/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#email', 'admin@elwataniya.com');
  await page.fill('#password', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  const links = await page.$$eval('a', els => els.map(e => ({ href: e.getAttribute('href'), text: (e.textContent || '').trim().split('\n')[0].trim().slice(0, 40) })));
  const unique = {};
  links.forEach(l => { if (l.href && l.href.startsWith('/ar')) { unique[l.href] = l.text; } });
  Object.keys(unique).forEach(h => console.log(h || '(none)', '|', unique[h]));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });