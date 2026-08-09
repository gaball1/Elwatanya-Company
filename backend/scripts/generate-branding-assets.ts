import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const assetsDir = path.resolve(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const PRIMARY = '#1e40af';
const SECONDARY = '#64748b';
const INK = '#1e293b';

async function render(html: string, file: string, width: number, height: number): Promise<void> {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(assetsDir, file),
      omitBackground: true,
      clip: { x: 0, y: 0, width, height },
    });
    console.log(`  ✓ ${file} (${width}x${height})`);
  } finally {
    await browser.close();
  }
}

function logoHtml(width: number, height: number): string {
  return `<!DOCTYPE html><html><head><style>
    body { margin:0; padding:0; width:${width}px; height:${height}px; font-family:'Segoe UI','Arial',sans-serif; }
    .logo { display:flex; align-items:center; gap:14px; height:100%; padding:0 6px; }
    .emblem { width:${Math.round(height * 0.78)}px; height:${Math.round(height * 0.78)}px; border-radius:50%;
      background:${PRIMARY}; color:#fff; display:flex; align-items:center; justify-content:center;
      font-size:${Math.round(height * 0.42)}px; font-weight:800; }
    .text { display:flex; flex-direction:column; justify-content:center; line-height:1.1; }
    .text .ar { font-size:${Math.round(height * 0.42)}px; font-weight:800; color:${INK}; }
    .text .en { font-size:${Math.round(height * 0.2)}px; font-weight:600; color:${SECONDARY}; letter-spacing:1px; }
  </style></head><body>
    <div class="logo">
      <div class="emblem">و</div>
      <div class="text">
        <div class="ar">الوطنية للمقاولات</div>
        <div class="en">AL WATANIYA CONSTRUCTION</div>
      </div>
    </div>
  </body></html>`;
}

function stampHtml(): string {
  const size = 420;
  const ringR = 190;
  const text = 'الوطنية للمقاولات العامه';
  const textEn = 'EL WATANIYA CONSTRUCTION CO.';
  return `<!DOCTYPE html><html><head><style>
    body { margin:0; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center;
      font-family:'Segoe UI','Arial',sans-serif; }
    .stamp { width:${size}px; height:${size}px; border-radius:50%; border:14px double ${PRIMARY};
      display:flex; flex-direction:column; align-items:center; justify-content:center; color:${PRIMARY};
      opacity:0.92; background:transparent; }
    .stamp .ar { font-size:44px; font-weight:800; }
    .stamp .en { font-size:26px; font-weight:700; letter-spacing:1px; margin-top:6px; }
    .stamp .line { width:140px; height:3px; background:${PRIMARY}; margin:14px 0 10px; }
    .stamp .sub { font-size:20px; font-weight:600; }
  </style></head><body>
    <div class="stamp">
      <div class="ar">${text}</div>
      <div class="en">${textEn}</div>
      <div class="line"></div>
      <div class="sub">مقاولات - إنشاءات - تشطيب</div>
    </div>
  </body></html>`;
}

function watermarkHtml(): string {
  return `<!DOCTYPE html><html><head><style>
    body { margin:0; width:1000px; height:560px; display:flex; align-items:center; justify-content:center;
      font-family:'Segoe UI','Arial',sans-serif; }
    .mark { font-size:90px; font-weight:800; letter-spacing:8px; color:${PRIMARY}; opacity:0.9;
      white-space:nowrap; }
    .sub { font-size:34px; font-weight:600; letter-spacing:14px; color:${SECONDARY}; margin-top:18px;
      text-align:center; }
  </style></head><body>
    <div>
      <div class="mark">الوطنية للمقاولات</div>
      <div class="sub">AL WATANIYA FOR CONSTRUCTION</div>
    </div>
  </body></html>`;
}

function signatureHtml(): string {
  return `<!DOCTYPE html><html><head><style>
    body { margin:0; width:340px; height:120px; font-family:'Segoe Script','Ink Free','Comic Sans MS',cursive; }
    .sig { font-size:64px; color:#1e3a8a; opacity:0.95; transform:rotate(-6deg); }
    .sig2 { font-size:30px; color:#334155; margin-top:8px; letter-spacing:2px; }
  </style></head><body>
    <div class="sig">أحمد حسن</div>
    <div class="sig2">A. Hassan</div>
  </body></html>`;
}

async function main() {
  console.log('Rendering branding assets...');
  await render(logoHtml(220, 80), 'logo.png', 220, 80);
  await render(logoHtml(120, 40), 'small-logo.png', 120, 40);
  await render(stampHtml(), 'stamp.png', 420, 420);
  await render(watermarkHtml(), 'watermark.png', 1000, 560);
  await render(signatureHtml(), 'signature.png', 340, 120);
  console.log(`Assets written to ${assetsDir}`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
