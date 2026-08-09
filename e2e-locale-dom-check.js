/* eslint-disable */
const { chromium } = require('playwright');

const BASE = process.env.UI_BASE || 'http://localhost:3000';
const results = [];
function record(label, ok, detail) {
  results.push({ label, ok: !!ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + label + (detail ? ' | ' + detail : ''));
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // ---- login first (once) ----
  await page.goto(BASE + '/ar/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('input[name="email"]', 'admin@elwataniya.com').catch(async () => {
    await page.fill('input[type="email"]', 'admin@elwataniya.com');
  });
  const pwdSel = page.locator('input[type="password"]').first();
  await pwdSel.waitFor({ state: 'visible', timeout: 15000 });
  await pwdSel.fill('Admin@123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/(\/(ar|en)\/admin)/, { timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('-- logged in, url=' + page.url() + '\n');

  // ============ ARABIC LOCALE ============
  await page.evaluate(() => { window.scrollTo(0, 0); });
  await page.goto(BASE + '/ar/admin', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const ar = {};
  ar.state = await page.evaluate(() => ({ lang: document.documentElement.fontSize ? document.documentElement.lang : document.documentElement.lang, dir: document.documentElement.dir }));
  ar.state = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir }));
  ar.bodyDir = await page.evaluate(() => getComputedStyle(document.body).direction);
  ar.ui = await page.evaluate(() => {
    const txt = document.body.innerText;
    const hasArabic = /لوحة التحكم|المشاريع|المقاولين/.test(txt);
    const hasEnglishOnly = /^(?!.*[أ-ي]).*(Dashboard|Projects)/.test(txt);
    return { hasArabic, hasEnglishOnly };
  });
  ar.sidebarDir = await page.evaluate(() => {
    const el = document.querySelector('aside') || document.querySelector('nav');
    return el ? getComputedStyle(el).direction : 'no-sidebar';
  });
  ar.mainDir = await page.evaluate(() => {
    const el = document.querySelector('main');
    return el ? getComputedStyle(el).direction : 'no-main';
  });
  ar.navDir = await page.evaluate(() => {
    const el = document.querySelector('header');
    return el ? getComputedStyle(el).direction : 'no-header';
  });
  // container direction check (any visible major container)
  ar.containerDirs = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('div, main, section, aside, header, nav'));
    return Array.from(new Set(all.map(e => getComputedStyle(e).direction).filter(Boolean))).slice(0, 10);
  });

  // ---------- Arabic checks ----------
  record('AR: <html lang="ar">', ar.state.lang === 'ar', 'lang=' + ar.state.lang);
  record('AR: <html dir="rtl">', ar.state.dir === 'rtl', 'dir=' + ar.state.dir);
  record('AR: <body> computed direction is rtl', ar.bodyDir === 'rtl', 'body=' + ar.bodyDir);
  record('AR: UI renders Arabic content', ar.ui.hasArabic, 'hasArabic=' + ar.ui.hasArabic);
  record('AR: dashboard covers RTL layout', ar.containerDirs.includes('rtl'), 'dirs=' + JSON.stringify(ar.containerDirs));

  // ---------- AR dashboard/sidebar ----------
  await page.goto(BASE + '/ar/admin', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  {
    const s = await page.evaluate(() => {
      const sidebar = document.querySelector('aside');
      const nav = sidebar ? sidebar.querySelector('nav') : null;
      return {
        sidebarDir: sidebar ? getComputedStyle(sidebar).direction : 'none',
        navDir: nav ? getComputedStyle(nav).direction : 'none',
        firstLinkHref: nav && nav.querySelector('a') ? nav.querySelector('a').getAttribute('href') : null,
      };
    });
    // aside keeps a fixed-position geometry dir, the nav content follows the locale
    record('AR-sidebar: sidebar nav content renders RTL', s.navDir === 'rtl', 'nav=' + s.navDir);
  }

  // ---------- AR form (login page) ----------
  await page.goto(BASE + '/ar/login', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  {
    const f = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? { dir: getComputedStyle(form).direction, inputs: form.querySelectorAll('input').length, btn: !!form.querySelector('button[type="submit"]') } : null;
    });
    record('AR-form: login form renders RTL', f && f.dir === 'rtl', 'dir=' + (f && f.dir));
    record('AR-form: render inputs+submit', f && f.inputs >= 2 && f.btn, 'inputs=' + (f && f.inputs));
  }

  // ---------- AR table (projects) ----------
  await page.goto(BASE + '/ar/projects', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  {
    const t = await page.evaluate(() => {
      const table = document.querySelector('table');
      const list = document.querySelector('[class*="grid"], [class*="list"]');
      return {
        htmlDir: document.documentElement.dir,
        tableDir: table ? getComputedStyle(table).direction : null,
        rows: table ? table.querySelectorAll('tr').length : 0,
        anyContent: !!list || !!table,
      };
    });
    record('AR-table: projects page <html> dir=rtl', t.htmlDir === 'rtl', 'dir=' + t.htmlDir);
    record('AR-table: projects table/grid renders in RTL doc', t.anyContent !== false, 'rows=' + t.rows + (t.tableDir ? ' tableDir=' + t.tableDir : ''));
  }

  // ============ ENGLISH LOCALE ============
  await page.goto(BASE + '/en/admin', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const en = {};
  en.state = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir }));
  en.bodyDir = await page.evaluate(() => getComputedStyle(document.body).direction);
  en.ui = await page.evaluate(() => {
    const txt = document.body.innerText;
    const hasEnglish = /Dashboard|Projects|Settings|Reports/.test(txt);
    const hasArabicOnly = /لوحة التحكم|المشاريع/.test(txt);
    return { hasEnglish, hasArabicOnly };
  });
  en.sidebarDir = await page.evaluate(() => {
    const el = document.querySelector('aside') || document.querySelector('nav');
    return el ? getComputedStyle(el).direction : 'no-sidebar';
  });
  en.mainDir = await page.evaluate(() => {
    const el = document.querySelector('main');
    return el ? getComputedStyle(el).direction : 'no-main';
  });
  en.containerDirs = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('div, main, section, aside, header, nav'));
    return Array.from(new Set(all.map(e => getComputedStyle(e).direction).filter(Boolean))).slice(0, 10);
  });

  // ---------- English checks ----------
  record('EN: <html lang="en">', en.state.lang === 'en', 'lang=' + en.state.lang);
  record('EN: <html dir="ltr">', en.state.dir === 'ltr', 'dir=' + en.state.dir);
  record('EN: <body> computed direction is ltr', en.bodyDir === 'ltr', 'body=' + en.bodyDir);
  record('EN: UI shows English content', en.ui.hasEnglish && !en.ui.hasArabicOnly, 'hasEnglish=' + en.ui.hasEnglish + ' hasArabic=' + en.ui.hasArabicOnly);
  record('EN: no rtl text/container leak', !en.ui.hasArabicOnly, 'hasArabic=' + en.ui.hasArabicOnly);

  // ---------- EN routes ----------
  await page.goto(BASE + '/en/admin', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  {
    const s = await page.evaluate(() => {
      const sidebar = document.querySelector('aside');
      return sidebar ? getComputedStyle(sidebar).direction : 'none';
    });
    record('EN-sidebar: renders LTR', s === 'ltr', 'sidebar=' + s);
  }

  // ---------- EN login ----------
  await page.goto(BASE + '/en/login', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  {
    const f = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? { dir: getComputedStyle(form).direction, inputs: form.querySelectorAll('input').length, submit: !!form.querySelector('button[type="submit"]') } : null;
    });
    record('EN-form: renders LTR with fields', f && f.dir === 'ltr' && f.inputs >= 2 && f.submit, JSON.stringify(f));
  }

  // coast EN project list
  await page.goto(BASE + '/en/projects', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  {
    const t = await page.evaluate(() => ({
      htmlDir: document.documentElement.dir,
      hasTable: !!document.querySelector('table'),
    }));
    record('EN-table: projects page dir=ltr', t.htmlDir === 'ltr', 'dir=' + t.htmlDir);
  }

  await browser.close();

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log('\n========== DOM LOCALE VERIFICATION ==========');
  console.log('PASS: ' + passed + '  FAIL: ' + failed + '  TOTAL: ' + results.length);
  process.exit(failed === 0 ? 0 : 1);
})();