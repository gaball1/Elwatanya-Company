import * as fs from 'fs';
import * as path from 'path';

const BASE = process.env.API_BASE || 'http://localhost:3001/api/v1';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@elwataniya.com';
if (!process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD is required. Refusing to use a default password.');
}
const PASSWORD = process.env.ADMIN_PASSWORD;
const assetsDir = path.resolve(__dirname, 'assets');

let token = '';
let adminId = '';
let failures = 0;

function log(msg: string): void {
  console.log(msg);
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

function fail(label: string, err: any): void {
  failures++;
  console.log(`  ✗ ${label}: ${err?.message?.slice(0, 300)}`);
}

async function request(method: string, pathname: string, opts: { body?: any; token?: string; raw?: boolean } = {}): Promise<any> {
  const headers: Record<string, string> = {};
  if (opts.token || token) headers['Authorization'] = `Bearer ${opts.token || token}`;
  let body: any;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  for (let attempt = 1; attempt <= 5; attempt++) {
    await sleep(1200);
    const res = await fetch(`${BASE}${pathname}`, { method, headers, body });
    if (res.status === 429) {
      const wait = 5000 + attempt * 2000;
      log(`  ⏳ rate-limited ${method} ${pathname}, retrying in ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${method} ${pathname} -> ${res.status} ${text.slice(0, 400)}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const json = await res.json();
      return json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
    }
    if (opts.raw) return res;
    return res.text();
  }
  throw new Error(`${method} ${pathname} -> rate limited after 5 attempts`);
}

async function uploadFile(buffer: Buffer, fileName: string, category: string): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)]), fileName);
  const data = await request('POST', `/files/upload?category=${encodeURIComponent(category)}`, { body: form });
  return data.id;
}

function publicUrl(fileId: string): string {
  return `/api/v1/files/public/${fileId}`;
}

function unwrap<T>(data: any, key: string): T {
  return (data && typeof data === 'object' && key in data ? data[key] : data) as T;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function iso(d: Date): string {
  return d.toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // ── 1. Login ──────────────────────────────────────────────────
  log('\n[1/15] Login');
  const login = await request('POST', '/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  token = login.accessToken;
  adminId = login.user?.id || '';
  if (!token) throw new Error('Login failed');
  ok(`Logged in as ${login.user?.email} (${login.user?.roleNames?.join(',')})`);

  // ── 2. Upload branding assets ─────────────────────────────────
  log('\n[2/15] Upload branding assets');
  const assetFiles: Record<string, string> = {};
  for (const name of ['logo', 'small-logo', 'stamp', 'watermark', 'signature']) {
    try {
      const fp = path.join(assetsDir, `${name}.png`);
      const buffer = fs.readFileSync(fp);
      const fileId = await uploadFile(buffer, `${name}.png`, 'company');
      assetFiles[name] = publicUrl(fileId);
      ok(`${name}.png -> ${assetFiles[name]}`);
    } catch (e) {
      fail(`upload ${name}`, e);
    }
  }

  // ── 3. Update company branding ────────────────────────────────
  log('\n[3/15] Update company branding');
  try {
    const companyBody: any = {
      name: 'AL WATANIYA For Construction',
      arabicName: 'الوطنية للمقاولات',
      address: '15 El Tahrir Street, Dokki, Giza, Egypt',
      phone: '+20 2 333 456 78',
      email: 'info@elwataniya.com',
      website: 'https://elwataniya.com',
      taxNumber: '123-456-789',
      commercialRegister: 'CR-2025-00123',
      currency: 'EGP',
      primaryColor: '#1e40af',
      secondaryColor: '#64748b',
      font: 'Arial',
      timezone: 'Africa/Cairo',
      language: 'ar',
    };
    if (assetFiles.logo) companyBody.logo = assetFiles.logo;
    if (assetFiles['small-logo']) companyBody.smallLogo = assetFiles['small-logo'];
    if (assetFiles.watermark) companyBody.watermark = assetFiles.watermark;
    if (assetFiles.stamp) companyBody.stamp = assetFiles.stamp;
    if (assetFiles.signature) companyBody.signature = assetFiles.signature;
    const company = unwrap<any>(await request('PUT', '/company', { body: companyBody }), 'company');
    ok(`Company: ${company.name}`);
  } catch (e) {
    fail('update company', e);
  }

  // ── 4. Project + Building + Fund ──────────────────────────────
  log('\n[4/15] Project + Building + Fund');
  let projectId = '';
  let buildingId = '';
  let fundId = '';
  try {
    const project = unwrap<any>(await request('POST', '/projects', {
      body: {
        code: 'NAC-P2-2026',
        name: 'مشروع الأندلس السكني - المرحلة الثانية',
        location: 'العاصمة الإدارية الجديدة، مصر',
        client: 'وزارة الإسكان والمجتمعات العمرانية',
        description: 'إنشاء 12 برج سكني وبنية تحتية في العاصمة الإدارية الجديدة',
        status: 'active',
        progress: 65,
        startDate: iso(new Date(2026, 0, 1)),
      },
    }), 'project');
    projectId = project.id;
    ok(`Project: ${project.name} (${projectId})`);

    const building = unwrap<any>(await request('POST', `/projects/${projectId}/buildings`, {
      body: {
        name: 'العمارة A - برج سكني',
        code: 'TOWER-A',
        type: 'سكني - 20 دور',
        status: 'active',
        startDate: iso(new Date(2026, 0, 15)),
      },
    }), 'building');
    buildingId = building.id;
    ok(`Building: ${building.name} (${buildingId})`);

    const fund = unwrap<any>(await request('POST', '/project-funds', {
      body: { projectId, initialBalance: 50000000 },
    }), 'fund');
    fundId = fund.id;
    ok(`Project fund: ${fundId}`);
  } catch (e) {
    fail('project/building/fund', e);
  }

  // ── 5. Employer + Analytical + Final BOQ ──────────────────────
  log('\n[5/15] BOQs (employer / analytical / final)');
  const boqItems: [string, string, string, number, number][] = [
    ['CONC-001', 'خرسانة جاهزة C250 للأساسات', 'm³', 1200, 1750],
    ['CONC-002', 'خرسانة جاهزة C300 للأعمدة', 'm³', 1800, 1950],
    ['CONC-003', 'خرسانة جاهزة C350 للبلاطات', 'm³', 2200, 2150],
    ['CONC-004', 'خرسانة جاهزة C400 للكمرات', 'm³', 950, 2350],
    ['STL-001', 'حديد تسليح أقطار 8مم', 'ton', 220, 28500],
    ['STL-002', 'حديد تسليح أقطار 12مم', 'ton', 320, 27000],
    ['STL-003', 'حديد تسليح أقطار 16مم', 'ton', 410, 26500],
    ['STL-004', 'حديد تسليح أقطار 20مم', 'ton', 260, 26000],
    ['STL-005', 'حديد تسليح أقطار 25مم', 'ton', 140, 25500],
    ['BRK-001', 'حوائط طوب أحمر سمك 12سم', 'm²', 5200, 190],
    ['BRK-002', 'حوائط طوب أحمر سمك 25سم', 'm²', 3800, 320],
    ['BRK-003', 'حوائط بلوك أسمنتي سمك 20سم', 'm²', 2400, 260],
    ['FIN-001', 'تركيب بلاط سيراميك أرضيات 40x40', 'm²', 6800, 165],
    ['FIN-002', 'تركيب بلاط بورسلين 60x60', 'm²', 5400, 240],
    ['FIN-003', 'تشطيب جدران (لياسة + معجون)', 'm²', 14000, 85],
    ['FIN-004', 'دهان واجهات مائي طبقتين', 'm²', 7200, 55],
    ['FIN-005', 'أسقف جبسية معلقة', 'm²', 3100, 210],
    ['FIN-006', 'أرضيات رخام للأدوار الأرضية', 'm²', 1600, 780],
    ['ELE-001', 'مواسير PVC لأسلاك الكهرباء 20مم', 'm', 9200, 18],
    ['ELE-002', 'أسلاك نحاس 6مم²', 'm', 14500, 42],
    ['ELE-003', 'أسلاك نحاس 4مم²', 'm', 18000, 29],
    ['ELE-004', 'لوحات توزيع كهربائية 12-قناة', 'unit', 380, 1450],
    ['ELE-005', 'إنارة LED 600x600 48W', 'unit', 1650, 320],
    ['PLM-001', 'مواسير PVC مياه 1"', 'm', 5400, 85],
    ['PLM-002', 'مواسير PPR مياه 25مم', 'm', 7200, 38],
    ['PLM-003', 'أدوات صحية كاملة', 'set', 520, 3850],
    ['PLM-004', 'خلاطات وأحواض مطابخ', 'unit', 480, 1650],
    ['SIT-001', 'أعمال حفر أساسات', 'm³', 32000, 95],
    ['SIT-002', 'ردم وتسوية', 'm³', 26000, 45],
    ['SIT-003', 'أعمال الطرق الداخلية (أساس + أسفلت)', 'm²', 8800, 260],
    ['SIT-004', 'أعمال تنسيق المواقع وزراعات', 'm²', 5200, 120],
  ];

  try {
    const employerPayload = boqItems.map(([itemCode, description, unit, quantity, unitPrice]: any[]) => ({
      itemCode, description, unit, quantity, unitPrice,
      totalValue: quantity * unitPrice,
    }));
    await request('PUT', `/buildings/${buildingId}/boq/employer`, { body: { items: employerPayload } });
    ok(`Employer BOQ: ${boqItems.length} items`);

    const analyticalPayload = boqItems.map(([itemCode, description, unit, quantity, unitPrice]: any[]) => ({
      itemCode, description, unit, quantity, unitPrice,
      totalValue: quantity * unitPrice,
    }));
    await request('PUT', `/buildings/${buildingId}/boq/analytical`, { body: { items: analyticalPayload } });
    ok(`Analytical BOQ: ${boqItems.length} items`);

    const finalResult = await request('POST', `/buildings/${buildingId}/boq/final/sync-from-analytical`);
    const finalItems = finalResult.items || [];
    ok(`Final BOQ sync: ${finalItems.length} items`);
  } catch (e) {
    fail('BOQs', e);
  }

  // ── 6. Subcontractors ─────────────────────────────────────────
  log('\n[6/15] Subcontractors');
  const subcontractors: { id: string; workType: string }[] = [];
  const subData = [
    { name: 'شركة مصر للإنشاءات المعدنية', workType: 'أعمال الهيكل الإنشائي', phone: '+20 2 1234 5678', email: 'info@misrsteel.com', address: '10 عباس العقاد، مدينة نصر' },
    { name: 'مؤسسة النيل للأعمال الكهربائية', workType: 'الأعمال الكهربائية', phone: '+20 2 2345 6789', email: 'info@elnilemech.com', address: '25 شارع التحرير، الدقي' },
    { name: 'شركة القاهرة للتشطيبات', workType: 'أعمال التشطيبات', phone: '+20 2 3456 7890', email: 'info@cairofinish.com', address: '5 شارع المعادي' },
  ];
  for (const sd of subData) {
    try {
      const sub = unwrap<any>(await request('POST', '/subcontractors', {
        body: { ...sd, marginType: 'percentage', marginValue: randFloat(5, 12), joinDate: iso(new Date(2026, 0, 1)), status: 'active' },
      }), 'subcontractor');
      subcontractors.push({ id: sub.id, workType: sub.workType });
      ok(`Subcontractor: ${sub.name}`);
    } catch (e) {
      fail(`subcontractor ${sd.name}`, e);
    }
  }

  // assign to building
  for (const sub of subcontractors) {
    try {
      await request('POST', `/buildings/${buildingId}/subcontractors`, {
        body: { subcontractorId: sub.id, workType: sub.workType, agreedPrice: randFloat(2000000, 15000000) },
      });
    } catch (e) {
      fail(`assign ${sub.workType}`, e);
    }
  }
  ok(`${subcontractors.length} subcontractors assigned to building`);

  // ── 7. Contractor BOQs (allocate final items) ─────────────────
  log('\n[7/15] Contractor BOQs (allocate)');
  let finalItems: any[] = [];
  try {
    const list = await request('GET', `/buildings/${buildingId}/boq/final`);
    finalItems = list.items || [];
  } catch (e) {
    fail('list final boq', e);
  }

  for (let ci = 0; ci < subcontractors.length; ci++) {
    const sub = subcontractors[ci];
    try {
      let allocated = 0;
      for (const fi of finalItems) {
        const qty = Number(fi.quantity || 0);
        let allocQty = 0;
        if (subcontractors.length === 3) {
          const shares = [Math.ceil(qty * 0.4), Math.ceil(qty * 0.3)];
          allocQty = ci === 0 ? shares[0] : ci === 1 ? shares[1] : qty - shares[0] - shares[1];
        } else {
          allocQty = Math.floor(qty / subcontractors.length);
        }
        if (allocQty <= 0) continue;
        await request('POST', `/buildings/${buildingId}/contractors/${sub.id}/boq/allocate`, {
          body: { itemCodeOrComponent: fi.itemCode, quantity: allocQty },
        });
        allocated++;
      }
      ok(`${sub.workType}: allocated ${allocated} items`);
    } catch (e) {
      fail(`allocate ${sub.workType}`, e);
    }
  }

  // ── 8. Extracts + Payments ────────────────────────────────────
  log('\n[8/15] Extracts + Payments');
  interface CbItem { itemCode: string; description: string; unit: string; quantity: number; assignedQuantity: number; unitPrice: number; }

  for (const sub of subcontractors) {
    try {
      const list = await request('GET', `/buildings/${buildingId}/contractors/${sub.id}/boq`);
      const items: CbItem[] = (list.items || []) as CbItem[];
      if (!items.length) {
        ok(`${sub.workType}: no boq items, skipped extracts`);
        continue;
      }
      const count = sub === subcontractors[0] ? 2 : 1;
      let prevMap: Record<string, number> = {};
      for (let seq = 1; seq <= count; seq++) {
        const extractItems = items.map((it) => {
          const assigned = Number(it.assignedQuantity ?? it.quantity ?? 0);
          const previous = prevMap[it.itemCode] || 0;
          const remaining = Math.max(0, assigned - previous);
          const current = seq < count ? Math.floor(remaining * 0.6) : remaining;
          return {
            itemCode: it.itemCode,
            description: it.description,
            unit: it.unit,
            contractQuantity: assigned,
            previous,
            current,
            executionPercent: 100,
            unitPrice: Number(it.unitPrice || 0),
          };
        });
        const extract = unwrap<any>(await request('POST', `/buildings/${buildingId}/contractors/${sub.id}/extracts`, {
          body: {
            status: seq === count ? 'final' : 'running',
            runningNumber: seq,
            label: `${sub.workType} - مستخلص رقم ${seq}`,
            insurancePercent: 5,
            date: iso(new Date(2026, 3 + seq, 10)),
            previousPaid: seq === 1 ? 0 : randFloat(200000, 800000),
            items: extractItems,
            manualDeductions: [
              { id: `penalty-${sub.id}-${seq}`, name: 'خصم غرامات تأخير', amount: randFloat(5000, 30000), type: 'manual' },
            ],
          },
        }), 'extract');
        // update previous quantities for next extract
        for (const it of extractItems) {
          prevMap[it.itemCode] = it.previous + it.current;
        }
        const netPayable = Number(extract.netPayable ?? extract.totalWorkValue ?? 0);
        await request('POST', `/buildings/${buildingId}/contractors/${sub.id}/payments`, {
          body: { amount: Math.max(1, netPayable * 0.8), date: iso(new Date(2026, 3 + seq, 18)), extractId: extract.id, notes: `دفعة عن ${extract.label}` },
        });
        ok(`${sub.workType}: extract #${seq} (net ${netPayable.toFixed(0)}) + payment`);
      }
    } catch (e) {
      fail(`extracts ${sub.workType}`, e);
    }
  }

  // ── 9. Client + statements ────────────────────────────────────
  log('\n[9/15] Client statements');
  try {
    const client = unwrap<any>(await request('POST', '/clients', {
      body: { name: 'وزارة الإسكان والمجتمعات العمرانية', email: 'housing@ministry.gov.eg', phone: '+20 2 1111 2222', status: 'active' },
    }), 'client');
    const totals = [5200000, 6800000];
    for (let i = 0; i < 2; i++) {
      const totalWork = totals[i];
      const deductions = [
        { type: 'TAXES', label: 'ضريبة 2.5%', amount: totalWork * 0.025 },
        { type: 'RETENTION', label: 'احتجاز 10%', amount: totalWork * 0.1 },
        { type: 'INSURANCE', label: 'تأمين 5%', amount: totalWork * 0.05 },
      ];
      const totalDed = deductions.reduce((s, d) => s + d.amount, 0);
      await request('POST', '/client-statements', {
        body: {
          statementNumber: `CS-NAC-${i + 1}`,
          projectId,
          projectName: 'مشروع الأندلس السكني - المرحلة الثانية',
          buildingId,
          buildingName: 'العمارة A - برج سكني',
          clientId: client.id,
          clientName: client.name,
          date: iso(new Date(2026, 4 + i, 15)),
          status: 'approved',
          totalWorkValue: totalWork,
          totalDeductions: totalDed,
          netPayable: totalWork - totalDed,
          items: [
            { description: 'أعمال خرسانية', amount: totalWork * 0.35, unit: 'm³', quantity: 2200 },
            { description: 'أعمال حديد تسليح', amount: totalWork * 0.25, unit: 'ton', quantity: 135 },
            { description: 'أعمال تشطيب', amount: totalWork * 0.2, unit: 'm²', quantity: 8800 },
            { description: 'أعمال كهرباء', amount: totalWork * 0.1, unit: 'unit', quantity: 420 },
            { description: 'أعمال صحية', amount: totalWork * 0.1, unit: 'set', quantity: 120 },
          ],
          deductions,
          signatures: [],
        },
      });
      ok(`Client statement CS-NAC-${i + 1} (${totalWork.toFixed(0)})`);
    }
  } catch (e) {
    fail('client statements', e);
  }

  // ── 10. Subcontractor statements ──────────────────────────────
  log('\n[10/15] Subcontractor statements');
  try {
    for (let i = 0; i < 2; i++) {
      const sub = subcontractors[i % subcontractors.length];
      const totalWork = [1500000, 2100000][i];
      const insurance = totalWork * 0.05;
      const deductions = [
        { type: 'TAXES', label: 'ضريبة 2.5%', amount: totalWork * 0.025 },
        { type: 'RETENTION', label: 'احتجاز 10%', amount: totalWork * 0.1 },
      ];
      const totalDed = deductions.reduce((s, d) => s + d.amount, 0) + insurance;
      await request('POST', '/subcontractor-statements', {
        body: {
          statementNumber: `SS-NAC-${i + 1}`,
          projectId,
          projectName: 'مشروع الأندلس السكني - المرحلة الثانية',
          buildingId,
          buildingName: 'العمارة A - برج سكني',
          subcontractorId: sub.id,
          subcontractorName: sub.workType,
          workType: sub.workType,
          date: iso(new Date(2026, 5 + i, 20)),
          status: 'approved',
          blockNumber: `B-${i + 1}`,
          formNumber: `F-${i + 1}`,
          insurancePercent: 5,
          totalWorkValue: totalWork,
          totalInsurance: insurance,
          totalDeductions: totalDed,
          previousPaid: i === 0 ? 0 : 400000,
          netPayable: totalWork - totalDed - (i === 0 ? 0 : 400000),
          runningNumber: i + 1,
          items: [
            { description: 'بند أعمال رئيسي 1', amount: totalWork * 0.4, unit: 'm³', quantity: 600 },
            { description: 'بند أعمال رئيسي 2', amount: totalWork * 0.35, unit: 'm²', quantity: 1200 },
            { description: 'بند أعمال رئيسي 3', amount: totalWork * 0.25, unit: 'unit', quantity: 80 },
          ],
          deductions,
          signatures: [],
        },
      });
      ok(`Subcontractor statement SS-NAC-${i + 1}`);
    }
  } catch (e) {
    fail('subcontractor statements', e);
  }

  // ── 11. Purchases + Miscellaneous ─────────────────────────────
  log('\n[11/15] Purchases + Miscellaneous');
  const materials = [
    ['أسمنت بورتلاند 50كجم', 'كيس', 4200, 48], ['حديد تسليح 16مم', 'طن', 180, 26500],
    ['بلاط سيراميك 40x40', 'م²', 5600, 160], ['مواسير PVC 4"', 'م', 3200, 140],
    ['أسلاك نحاس 6مم²', 'م', 8400, 42], ['دهان داخلي أبيض', 'جالون', 2600, 320],
    ['رمل ناعم', 'م³', 12000, 55], ['زلط 1"', 'م³', 9800, 68],
    ['طوب أحمر 6x12x25', 'ألف', 1600, 1450], ['خشب زان 18مم', 'لوح', 2400, 620],
  ];
  for (let i = 0; i < 25; i++) {
    const m = materials[i % materials.length];
    const qty = rand(50, m[1] === 'طن' ? 400 : 9000);
    const unitPrice = m[3] as number;
    try {
      await request('POST', '/purchases', {
        body: {
          projectId,
          buildingId,
          itemName: m[0],
          quantity: qty,
          unit: m[1],
          unitPrice,
          date: iso(new Date(2026, rand(0, 6), rand(1, 28))),
          notes: `أمر شراء رقم ${i + 1}`,
          supplierName: pick(['السويدي إليكتروميتال', 'حديد عز', 'لافارج للأسمنت', 'مصر للسيراميك', 'سيكا مصر']),
          createdBy: adminId,
        },
      });
    } catch (e) {
      fail(`purchase ${i + 1}`, e);
    }
  }
  ok('25 purchase orders');
  const miscCategories = ['transport', 'tools', 'other', 'food', 'transport'];
  for (let i = 0; i < 5; i++) {
    try {
      await request('POST', '/miscellaneous', {
        body: {
          projectId,
          description: `مصروف إضافي - ${miscCategories[i]}`,
          amount: randFloat(50000, 450000),
          category: miscCategories[i],
          date: iso(new Date(2026, rand(0, 6), rand(1, 28))),
          notes: `بند مصروفات ${i + 1}`,
          createdBy: adminId,
        },
      });
    } catch (e) {
      fail(`miscellaneous ${i + 1}`, e);
    }
  }
  ok('5 miscellaneous expenses');

  // ── 12. Treasury (fund transactions) ──────────────────────────
  log('\n[12/15] Treasury');
  try {
    const incomeCats = ['general'];
    const expenseCats = ['purchase', 'miscellaneous'];
    for (let i = 0; i < 30; i++) {
      const isIncome = i < 12;
      const type = isIncome ? 'add' : 'deduct';
      const category = isIncome ? pick(incomeCats) : pick(expenseCats);
      await request('POST', '/fund-transactions', {
        body: {
          fundId,
          type,
          category,
          amount: isIncome ? randFloat(200000, 2500000) : randFloat(50000, 900000),
          description: `${isIncome ? 'إيراد' : 'مصروف'} - ${category} #${i + 1}`,
          date: iso(new Date(2026, rand(0, 6), rand(1, 28))),
          status: 'approved',
          notes: `حركة ${i + 1}`,
          createdBy: adminId,
        },
      });
    }
    ok('30 fund transactions');
  } catch (e) {
    fail('treasury', e);
  }

  // ── 13. Inventory (warehouse + categories + items + movements) ──
  log('\n[13/15] Inventory');
  try {
    const warehouse = unwrap<any>(await request('POST', '/warehouses', {
      body: { code: 'WH-MAIN', name: 'المخزن الرئيسي - موقع العاصمة', location: 'العاصمة الإدارية، الموقع A', status: 'active' },
    }), 'warehouse');
    const catData = [
      { code: 'CEM', name: 'أسمنت ومواد ربط' }, { code: 'STL', name: 'حديد تسليح' },
      { code: 'CER', name: 'سيراميك وبلاط' }, { code: 'ELE', name: 'مهمات كهربائية' },
      { code: 'PLM', name: 'مهمات صحية' }, { code: 'AGG', name: 'ركام ورمال' },
    ];
    const categories: string[] = [];
    for (const cd of catData) {
      const cat = unwrap<any>(await request('POST', '/categories', { body: { code: cd.code, name: cd.name, status: 'active' } }), 'category');
      categories.push(cat.id);
    }
    const invNames: [string, string, number][] = [
      ['أسمنت بورتلاند 50كجم', 'كيس', 2200], ['حديد تسليح 12مم', 'طن', 95], ['حديد تسليح 16مم', 'طن', 60],
      ['سيراميك أرضيات 40x40', 'م²', 1800], ['بورسلين 60x60', 'م²', 900], ['أسلاك نحاس 6مم²', 'لفة', 420],
      ['لوحة توزيع 12-قناة', 'قطعة', 140], ['مواسير PPR 25مم', 'م', 3200], ['خلاط حوض', 'قطعة', 85],
      ['رمل ناعم', 'م³', 2600], ['زلط 3/4', 'م³', 1900], ['دهان خارجي أبيض', 'جالون', 340],
      ['طوب أحمر', 'ألف', 620], ['خشب زان 18مم', 'لوح', 900], ['سيراميك حوائط 25x40', 'م²', 1200],
      ['كابلات كهرباء 4مم²', 'لفة', 380], ['أدوات صحية كاملة', 'قطعة', 55], ['مواسير PVC 4"', 'م', 1500],
      ['غرانيت أرضيات', 'م²', 320], ['بوية عازلة', 'جالون', 210],
    ];
    let invCount = 0;
    for (let i = 0; i < 40; i++) {
      const [name, unit, baseQty] = invNames[i % invNames.length];
      const quantity = rand(0, baseQty);
      const minQuantity = rand(20, 120);
      const price = randFloat(25, 30000);
      const status = quantity <= minQuantity ? 'inactive' : 'active';
      try {
        const item = unwrap<any>(await request('POST', '/inventory-items', {
          body: {
            code: `INV-${String(i + 1).padStart(4, '0')}`,
            name,
            description: `خامة بناء - ${name}`,
            categoryId: categories[i % categories.length],
            warehouseId: warehouse.id,
            unit,
            quantity,
            minQuantity,
            price,
            status,
          },
        }), 'item');
        invCount++;
        if (i % 3 === 0) {
          await request('POST', '/stock-movements', {
            body: {
              itemId: item.id,
              type: 'RECEIVE',
              quantity: rand(50, 300),
              date: iso(new Date(2026, rand(0, 6), rand(1, 28))),
              reference: `REF-${i + 1}`,
              notes: 'استلام مخزني',
              supplier: 'مورد رئيسي',
            },
          });
        }
      } catch (e) {
        fail(`inventory item ${i + 1}`, e);
      }
    }
    ok(`Warehouse + ${catData.length} categories + ${invCount} inventory items + movements`);
  } catch (e) {
    fail('inventory', e);
  }

  // ── 14. Employees + Attendance ────────────────────────────────
  log('\n[14/15] Employees + Attendance');
  try {
    const depts: Record<string, string> = {};
    for (const d of [
      { code: 'ENG', name: 'الهندسة' }, { code: 'FIN', name: 'المالية' }, { code: 'LOG', name: 'اللوجستيات' },
    ]) {
      const dep = unwrap<any>(await request('POST', '/departments', { body: { code: d.code, name: d.name, status: 'active' } }), 'department');
      depts[d.code] = dep.id;
    }
    const empData: [string, string, string, string, number][] = [
      ['EMP-001', 'أحمد حسن', 'مدير مشروع', 'ENG', 45000], ['EMP-002', 'محمد علي', 'مهندس موقع', 'ENG', 25000],
      ['EMP-003', 'سارة أحمد', 'محاسب', 'FIN', 15000], ['EMP-004', 'خالد إبراهيم', 'مهندس إنشائي', 'ENG', 28000],
      ['EMP-005', 'ليلى محمود', 'مهندس كهرباء', 'ENG', 26000], ['EMP-006', 'تامر فوزي', 'مهندس ميكانيكا', 'ENG', 26000],
      ['EMP-007', 'هبة رشاد', 'كميات', 'ENG', 22000], ['EMP-008', 'ياسر كمال', 'أمين مخزن', 'LOG', 8000],
      ['EMP-009', 'أيمن سعيد', 'مشتريات', 'LOG', 18000], ['EMP-010', 'منى جلال', 'محلل مالي', 'FIN', 16000],
      ['EMP-011', 'هاني نصر', 'مشرف موقع', 'ENG', 15000], ['EMP-012', 'وليد نبيل', 'مراقب تكاليف', 'FIN', 20000],
    ];
    const employees: string[] = [];
    for (const [code, name, role, dept, salary] of empData) {
      const emp = unwrap<any>(await request('POST', '/employees', {
        body: {
          code, fullName: name,
          nationalId: String(rand(10000000000000, 99999999999999)),
          phone: `+20 1${rand(0, 1)}${rand(10000000, 99999999)}`,
          email: `${code.toLowerCase()}@elwataniya.com`,
          address: `شارع ${rand(1, 100)}، القاهرة`,
          hireDate: iso(new Date(2025, rand(0, 11), rand(1, 28))),
          departmentId: depts[dept],
          salary,
          status: 'active',
          notes: role,
        },
      }), 'employee');
      employees.push(emp.id);
    }
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const statuses = ['present', 'present', 'present', 'late', 'absent'];
    let attCount = 0;
    for (let d = 1; d <= daysInMonth && attCount < 90; d++) {
      for (const empId of employees) {
        const st = pick(statuses);
        if (st === 'absent') continue;
        const checkInHour = st === 'late' ? rand(9, 11) : rand(7, 9);
        const checkInTime = iso(new Date(year, month, d, checkInHour, rand(0, 59), 0));
        try {
          await request('POST', '/attendance/check-in', {
            body: {
              employeeId: empId,
              date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
              checkInTime,
              projectId,
              buildingId,
              notes: st === 'late' ? 'تأخر - زحام' : '',
            },
          });
          attCount++;
        } catch (e) {
          fail(`attendance ${empId} day ${d}`, e);
        }
      }
    }
    ok(`${empData.length} employees + departments + ${attCount} attendance records`);
  } catch (e) {
    fail('employees/attendance', e);
  }

  // ── 15. Summary ───────────────────────────────────────────────
  log('\n[15/15] Summary');
  const checks: [string, string][] = [
    ['Projects', '/projects'],
    ['Buildings', `/projects/${projectId}/buildings`],
    ['Employer BOQ items', `/buildings/${buildingId}/boq/employer`],
    ['Analytical BOQ items', `/buildings/${buildingId}/boq/analytical`],
    ['Final BOQ items', `/buildings/${buildingId}/boq/final`],
    ['Subcontractors', '/subcontractors'],
    ['Client statements', '/client-statements'],
    ['Subcontractor statements', '/subcontractor-statements'],
    ['Purchases', '/purchases'],
    ['Miscellaneous', '/miscellaneous'],
    ['Project funds', '/project-funds'],
    ['Fund transactions', '/fund-transactions'],
    ['Warehouses', '/warehouses'],
    ['Categories', '/categories'],
    ['Inventory items', '/inventory-items'],
    ['Stock movements', '/stock-movements'],
    ['Employees', '/employees'],
    ['Attendance', '/attendance'],
  ];
  for (const [label, pathname] of checks) {
    try {
      const data = await request('GET', pathname);
      const arr = data.items || data.buildings || data.documents || data.files || data.fund || [];
      const count = Array.isArray(arr) ? arr.length : 1;
      console.log(`  ${label.padEnd(24)} ${count}`);
    } catch (e) {
      console.log(`  ${label.padEnd(24)} ERR ${e?.message?.slice(0, 80)}`);
    }
  }

  console.log(`\nFailures: ${failures}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Workflow failed:', err);
  process.exit(1);
});
