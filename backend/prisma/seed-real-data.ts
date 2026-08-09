import { PrismaClient, DeductionTypeEnum } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Deterministic RNG so re-runs produce identical data for new projects
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260731);
const rint = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const rchance = (p: number) => rand() < p;
const round2 = (v: number) => Math.round(v * 100) / 100;
const num = (v: any): number => Number(v);

// ---------------------------------------------------------------------------
// Master data
// ---------------------------------------------------------------------------
const EMPLOYER_TEMPLATES = [
  { code: '01', desc: 'أعمال حفر وردم وتسوية', unit: 'm3', rate: 120 },
  { code: '02', desc: 'صبة نظافة خرسانة عادية', unit: 'm3', rate: 900 },
  { code: '03', desc: 'خرسانة مسلحة للقواعد', unit: 'm3', rate: 4200 },
  { code: '04', desc: 'خرسانة مسلحة للأعمدة', unit: 'm3', rate: 4600 },
  { code: '05', desc: 'خرسانة مسلحة للأسقف', unit: 'm3', rate: 4500 },
  { code: '06', desc: 'حديد تسليح مجهز ومقص', unit: 'ton', rate: 48000 },
  { code: '07', desc: 'شدة خشبية للأسقف', unit: 'm2', rate: 320 },
  { code: '08', desc: 'طوب أسمنتي حوائط', unit: 'm2', rate: 210 },
  { code: '09', desc: 'محارة حوائط وأسقف', unit: 'm2', rate: 95 },
  { code: '10', desc: 'سيراميك أرضيات', unit: 'm2', rate: 180 },
  { code: '11', desc: 'سيراميك حوائط', unit: 'm2', rate: 165 },
  { code: '12', desc: 'دهانات بلاستيك', unit: 'm2', rate: 85 },
  { code: '13', desc: 'عزل مائي للأسطح', unit: 'm2', rate: 140 },
  { code: '14', desc: 'ألمونيوم وشبابيك', unit: 'm2', rate: 750 },
  { code: '15', desc: 'واجهات حجر', unit: 'm2', rate: 1250 },
];

// Price factor per contractor BOQ item, indexed by template slot (0..14)
// scenario healthy/loss/medium
function priceFactors(scenario: string): number[] {
  if (scenario === 'loss') {
    // most items priced above employer rate -> losses
    return [1.2, 1.18, 1.15, 1.12, 1.1, 1.05, 0.92, 1.05, 1.1, 1.08, 0.95, 1.05, 1.15, 0.9, 1.2];
  }
  if (scenario === 'medium') {
    return [0.98, 0.97, 0.96, 0.95, 0.94, 0.95, 0.9, 0.92, 0.88, 0.9, 0.86, 0.88, 0.93, 0.9, 0.97];
  }
  // healthy
  return [0.85, 0.84, 0.83, 0.82, 0.82, 0.8, 0.78, 0.8, 0.78, 0.79, 0.77, 0.78, 0.8, 0.85, 0.9];
}

const NEW_CONTRACTORS = [
  { name: 'مقاولات الأهرام للبناء', workType: 'أعمال عامة', marginValue: 12 },
  { name: 'مؤسسة النيل للمقاولات', workType: 'أعمال عامة', marginValue: 10 },
  { name: 'شركة الدلتا للخرسانة', workType: 'خرسانة مسلحة', marginValue: 8 },
  { name: 'مقاولات النور للهيكل الخرساني', workType: 'أعمال عامة', marginValue: 15 },
  { name: 'شركة الصعيد للتشطيبات', workType: 'تشطيبات', marginValue: 10 },
  { name: 'مؤسسة الرشيدي للمحارة والدهانات', workType: 'محارة ودهانات', marginValue: 9 },
  { name: 'شركة الواحة للأعمال الكهربائية', workType: 'أعمال كهرباء', marginValue: 14 },
];

const NEW_SUPPLIERS = [
  { name: 'شركة حديد المصريين', contactPerson: 'أحمد محمود', products: ['حديد تسليح', 'صاج'] },
  { name: 'شركة أسمنت سينا', contactPerson: 'محمد حسن', products: ['أسمنت', 'رمل'] },
  { name: 'مصنع الطوب الأبيض', contactPerson: 'خالد إبراهيم', products: ['طوب أسمنتي', 'طوب طفلي'] },
  { name: 'شركة السويس للخرسانة الجاهزة', contactPerson: 'سامح علي', products: ['خرسانة جاهزة'] },
  { name: 'مؤسسة الأمانة للسيراميك', contactPerson: 'إيهاب عادل', products: ['سيراميك أرضيات', 'سيراميك حوائط'] },
  { name: 'شركة دلتا للدهانات', contactPerson: 'طارق فتحي', products: ['دهانات بلاستيك', 'بوية زيت'] },
  { name: 'مصنع العزل الحديث', contactPerson: 'هاني شكري', products: ['عزل مائي', 'عزل حراري'] },
  { name: 'شركة الألومنيوم الوطنية', contactPerson: 'وليد سمير', products: ['ألمونيوم', 'زجاج'] },
  { name: 'مؤسسة الحجر الطبيعي', contactPerson: 'أسامة رشاد', products: ['واجهات حجر'] },
  { name: 'شركة الكهرباء المتكاملة', contactPerson: 'ماجد فؤاد', products: ['كابلات', 'مفاتيح'] },
];

const CLIENT_NAMES = [
  { name: 'شركة العاصمة للاستثمار العقاري', contactPerson: 'د. محمد عبد الله' },
  { name: 'مجموعة مدينة نصر للتطوير', contactPerson: 'م. خالد النجار' },
  { name: 'شركة الساحل للتطوير السياحي', contactPerson: 'م. هشام عبد العزيز' },
];

const NEW_DEPARTMENTS = [
  { code: 'ENG', name: 'الهندسة والتنفيذ' },
  { code: 'FIN', name: 'المالية والحسابات' },
  { code: 'HR', name: 'الموارد البشرية' },
  { code: 'PROC', name: 'المشتريات والمخازن' },
  { code: 'SAFE', name: 'السلامة والصحة المهنية' },
];

const NEW_WAREHOUSES = [
  { code: 'WH-CAIRO', name: 'مخزن القاهرة الرئيسي' },
  { code: 'WH-SITE', name: 'مخزن الموقع المركزي' },
];

const NEW_CATEGORIES = [
  { code: 'CAT-CONC', name: 'خرسانة' },
  { code: 'CAT-STEEL', name: 'حديد' },
  { code: 'CAT-BLK', name: 'طوب' },
  { code: 'CAT-FIN', name: 'تشطيبات' },
  { code: 'CAT-ELEC', name: 'كهرباء' },
  { code: 'CAT-PLUMB', name: 'سباكة' },
];

const MATERIAL_ITEMS = [
  { name: 'أسمنت بورتلاندي', unit: 'ton' },
  { name: 'حديد تسليح 16مم', unit: 'ton' },
  { name: 'رمل', unit: 'm3' },
  { name: 'زلط', unit: 'm3' },
  { name: 'طوب أسمنتي', unit: 'm2' },
  { name: 'سيراميك أرضيات 60*60', unit: 'm2' },
  { name: 'سيراميك حوائط 30*60', unit: 'm2' },
  { name: 'بوية بلاستيك', unit: 'kg' },
  { name: 'مادة عزل مائي', unit: 'kg' },
  { name: 'ألمونيوم قطاعات', unit: 'kg' },
];

const FIRST_NAMES = ['أحمد', 'محمد', 'محمود', 'خالد', 'سامح', 'إيهاب', 'طارق', 'هاني', 'وليد', 'أسامة', 'ماجد', 'كريم', 'ياسر', 'عمرو', 'عادل', 'حسام', 'رامي', 'شريف', 'مصطفى', 'عبد الرحمن', 'هيثم', 'إسلام', 'مؤمن', 'زكريا'];
const LAST_NAMES = ['عبد العزيز', 'السيد', 'النجار', 'محمد', 'إبراهيم', 'حسن', 'علي', 'فؤاد', 'سمير', 'رشاد', 'العمري', 'شعبان', 'الديب', 'عبد الرحمن', 'عاشور', 'جودة', 'صقر', 'نصر', 'فتحي', 'حمدان'];

const PROJECT_DEFS = [
  {
    code: 'NCT-2026',
    name: 'برج النيل التجاري',
    location: 'العاصمة الإدارية الجديدة',
    client: 'شركة العاصمة للاستثمار العقاري',
    startMonthsAgo: 10,
    scenario: 'healthy',
    status: 'active',
    progress: 60,
    buildings: [
      { name: 'البرج الرئيسي - أ', type: 'برج' },
      { name: 'البرج الرئيسي - ب', type: 'برج' },
      { name: 'جراج البرج', type: 'جراج' },
      { name: 'مباني الخدمات', type: 'خدمات' },
    ],
  },
  {
    code: 'NCM-2026',
    name: 'مول المدينة التجاري',
    location: 'مدينة نصر - القاهرة',
    client: 'مجموعة مدينة نصر للتطوير',
    startMonthsAgo: 14,
    scenario: 'loss',
    status: 'active',
    progress: 25,
    buildings: [
      { name: 'المبنى التجاري الرئيسي', type: 'مول' },
      { name: 'المول المفتوح', type: 'مول' },
      { name: 'مواقف السيارات', type: 'جراج' },
      { name: 'مباني إدارية', type: 'إداري' },
    ],
  },
  {
    code: 'CR3-2026',
    name: 'منتجع الساحل الشمالي - مرحلة 3',
    location: 'الساحل الشمالي',
    client: 'شركة الساحل للتطوير السياحي',
    startMonthsAgo: 8,
    scenario: 'medium',
    status: 'active',
    progress: 40,
    buildings: [
      { name: 'فيلا البحر - أ', type: 'فيلا' },
      { name: 'فيلا البحر - ب', type: 'فيلا' },
      { name: 'المبنى الفندقي', type: 'فندق' },
      { name: 'الممشى السياحي', type: 'مرافق' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getOrCreateContractors() {
  const existing = await prisma.subcontractor.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, workType: true },
  });
  const byName = new Map(existing.map((c) => [c.name, c]));
  for (const c of NEW_CONTRACTORS) {
    if (!byName.has(c.name)) {
      const created = await prisma.subcontractor.create({
        data: {
          name: c.name,
          workType: c.workType,
          marginType: 'percentage',
          marginValue: c.marginValue,
          status: 'active',
          joinDate: new Date(2025, 0, 15),
        },
      });
      byName.set(c.name, created);
    }
  }
  return Array.from(byName.values());
}

async function getOrCreateSuppliers() {
  const existing = await prisma.supplier.findMany({ where: { deletedAt: null } });
  const byName = new Map(existing.map((s) => [s.name, s]));
  for (const s of NEW_SUPPLIERS) {
    if (!byName.has(s.name)) {
      const created = await prisma.supplier.create({
        data: {
          name: s.name,
          contactPerson: s.contactPerson,
          products: s.products,
          status: 'active',
          joinDate: new Date(2024, 6, 1),
        },
      });
      byName.set(s.name, created);
    }
  }
  return Array.from(byName.values());
}

async function getOrCreateClients() {
  const existing = await prisma.client.findMany({ where: { deletedAt: null } });
  const byName = new Map(existing.map((c) => [c.name, c]));
  for (const c of CLIENT_NAMES) {
    if (!byName.has(c.name)) {
      const created = await prisma.client.create({
        data: { name: c.name, contactPerson: c.contactPerson, status: 'active' },
      });
      byName.set(c.name, created);
    }
  }
  return Array.from(byName.values());
}

async function getOrCreateDepartments() {
  const existing = await prisma.department.findMany({ where: { deletedAt: null } });
  const byCode = new Map(existing.map((d) => [d.code, d]));
  for (const d of NEW_DEPARTMENTS) {
    if (!byCode.has(d.code)) {
      const created = await prisma.department.create({ data: d });
      byCode.set(d.code, created);
    }
  }
  return Array.from(byCode.values());
}

async function getOrCreateWarehouses() {
  const existing = await prisma.warehouse.findMany({ where: { deletedAt: null } });
  const byCode = new Map(existing.map((w) => [w.code, w]));
  for (const w of NEW_WAREHOUSES) {
    if (!byCode.has(w.code)) {
      const created = await prisma.warehouse.create({ data: w });
      byCode.set(w.code, created);
    }
  }
  return Array.from(byCode.values());
}

async function getOrCreateCategories() {
  const existing = await prisma.category.findMany({ where: { deletedAt: null } });
  const byCode = new Map(existing.map((c) => [c.code, c]));
  for (const c of NEW_CATEGORIES) {
    if (!byCode.has(c.code)) {
      const created = await prisma.category.create({ data: c });
      byCode.set(c.code, created);
    }
  }
  return Array.from(byCode.values());
}

// ---------------------------------------------------------------------------
// Per-project seeding
// ---------------------------------------------------------------------------
async function seedProject(def: (typeof PROJECT_DEFS)[number], contractors: any[], suppliers: any[], clients: any[]) {
  const existingProject = await prisma.project.findUnique({ where: { code: def.code } });
  if (existingProject) {
    console.log(`SKIP ${def.code} - already exists`);
    return;
  }

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - def.startMonthsAgo);

  const client = clients.find((c) => c.name === def.client)!;
  const factors = priceFactors(def.scenario);
  const step = def.scenario === 'healthy' ? 0.075 : def.scenario === 'loss' ? 0.02 : 0.05;
  const numStatements = def.scenario === 'healthy' ? 8 : def.scenario === 'loss' ? 8 : 6;

  const project = await prisma.project.create({
    data: {
      code: def.code,
      name: def.name,
      location: def.location,
      client: def.client,
      startDate,
      status: def.status,
      progress: def.progress,
    },
  });

  // Fund
  const initialBalance = def.scenario === 'loss' ? 2_000_000 : 15_000_000;
  const fund = await prisma.projectFund.create({
    data: { projectId: project.id, initialBalance, currentBalance: initialBalance },
  });

  let runningByBoq = new Map<string, number>();

  for (const bDef of def.buildings) {
    const building = await prisma.building.create({
      data: {
        projectId: project.id,
        name: bDef.name,
        code: `${def.code}-${bDef.type}`,
        type: bDef.type,
        status: 'active',
        startDate,
      },
    });

    const qtyBase = def.scenario === 'loss' ? 80 : 100;
    const qtyMultiplier = rint(80, 120) / 100;

    // ----- Employer / Analytical / Final BOQ -----
    const employerItems = EMPLOYER_TEMPLATES.map((t, idx) => {
      const quantity = round2(qtyBase * qtyMultiplier * (0.8 + 0.4 * rand()));
      return {
        buildingId: building.id,
        itemCode: t.code,
        description: t.desc,
        unit: t.unit,
        quantity,
        unitPrice: t.rate,
        totalValue: round2(quantity * t.rate),
      };
    });

    await prisma.employerBoqItem.createMany({ data: employerItems });
    await prisma.analyticalBoqItem.createMany({
      data: employerItems.map((i) => ({ ...i })),
    });

    const finalBoq = await prisma.finalBoq.create({
      data: {
        buildingId: building.id,
        projectId: project.id,
        businessCode: `${def.code}-FB-${bDef.name}`,
        status: 'analyzed',
      },
    });
    const finalItems = employerItems.map((i, idx) => ({
      finalBoqId: finalBoq.id,
      businessCode: i.itemCode,
      description: i.description,
      unit: i.unit,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      totalValue: i.totalValue,
      itemStatus: 'distributed',
      sortOrder: idx + 1,
    }));
    await prisma.finalBoqItem.createMany({ data: finalItems });
    const createdFinalItems = await prisma.finalBoqItem.findMany({ where: { finalBoqId: finalBoq.id } });
    const components = createdFinalItems.map((fi, idx) => ({
      finalBoqItemId: fi.id,
      businessCode: `C-${fi.businessCode}`,
      description: `مكوّن ${fi.description}`,
      unit: fi.unit,
      unitPrice: fi.unitPrice,
      quantity: fi.quantity,
      totalValue: fi.totalValue,
      lifecycleStatus: 'distributed',
      sortOrder: idx + 1,
    }));
    await prisma.component.createMany({ data: components });
    const createdComponents = await prisma.component.findMany({
      where: { finalBoqItemId: { in: createdFinalItems.map((f) => f.id) } },
      orderBy: { sortOrder: 'asc' },
    });

    // ----- Contractor BOQs -----
    // BOQ1 mirrors employer items (main works)
    const mainContractor = contractors[rint(0, contractors.length - 1)];
    await prisma.buildingSubcontractor.create({
      data: { buildingId: building.id, subcontractorId: mainContractor.id, workType: 'أعمال عامة' },
    });
    const boq1 = await prisma.contractorBoq.create({
      data: {
        buildingId: building.id,
        subcontractorId: mainContractor.id,
        workType: 'أعمال عامة',
        status: def.scenario === 'loss' ? 'InProgress' : 'Approved',
        createdAt: startDate,
      },
    });

    const contractorItems = employerItems.map((i, idx) => {
      const factor = factors[idx % factors.length];
      const unitPrice = round2(i.unitPrice * factor);
      return {
        contractorBoqId: boq1.id,
        itemCode: i.itemCode,
        description: i.description,
        unit: i.unit,
        unitPrice,
        quantity: i.quantity,
        assignedQuantity: i.quantity,
        totalValue: round2(i.quantity * unitPrice),
        finalItemId: createdFinalItems[idx].id,
        componentId: createdComponents[idx].id,
      };
    });
    await prisma.contractorBoqItem.createMany({ data: contractorItems });
    const boq1Items = await prisma.contractorBoqItem.findMany({ where: { contractorBoqId: boq1.id } });

    // BOQ2 specialty works (electrical) - items not in employer -> excluded from profit split
    let specContractor = contractors[rint(0, contractors.length - 1)];
    if (specContractor.id === mainContractor.id) {
      specContractor = contractors[(contractors.indexOf(specContractor) + 1) % contractors.length];
    }
    await prisma.buildingSubcontractor.create({
      data: { buildingId: building.id, subcontractorId: specContractor.id, workType: 'أعمال كهرباء' },
    });
    const boq2 = await prisma.contractorBoq.create({
      data: {
        buildingId: building.id,
        subcontractorId: specContractor.id,
        workType: 'أعمال كهرباء',
        status: 'Approved',
        createdAt: startDate,
      },
    });
    const specItems = [0, 1, 2].map((k) => ({
      contractorBoqId: boq2.id,
      itemCode: `E${k + 1}`,
      description: k === 0 ? 'كابلات وتوصيلات كهربائية' : k === 1 ? 'مفاتيح وإضاءة' : 'لوحات توزيع كهرباء',
      unit: 'no',
      unitPrice: [8500, 6200, 24000][k],
      quantity: 8,
      assignedQuantity: 8,
      totalValue: [8500, 6200, 24000][k] * 8,
    }));
    await prisma.contractorBoqItem.createMany({ data: specItems });
    const boq2Items = await prisma.contractorBoqItem.findMany({ where: { contractorBoqId: boq2.id } });

    // ----- Statements -----
    let prevPaid = 0;
    for (let s = 1; s <= numStatements; s++) {
      const seq = runningByBoq.get(boq1.id) ?? 0;
      runningByBoq.set(boq1.id, seq + 1);
      const execPercent = round2(s * step * 100);
      const items = boq1Items.map((ci) => ({
        statementId: '',
        contractorBoqItemId: ci.id,
        itemCode: ci.itemCode,
        description: ci.description,
        unit: ci.unit,
        contractQuantity: num(ci.assignedQuantity),
        previousQuantity: round2(num(ci.assignedQuantity) * ((s - 1) * step)),
        currentQuantity: round2(num(ci.assignedQuantity) * step),
        totalQuantity: round2(num(ci.assignedQuantity) * s * step),
        executionPercent: execPercent,
        totalExecuted: round2(num(ci.assignedQuantity) * s * step),
        unitPrice: num(ci.unitPrice),
        currentWorkValue: round2(num(ci.assignedQuantity) * step * num(ci.unitPrice)),
      }));
      const totalWorkValue = round2(items.reduce((acc, i) => acc + i.currentWorkValue, 0));
      const insurance = round2(totalWorkValue * 0.05);
      const netPayable = round2(totalWorkValue - insurance);
      const stmt = await prisma.statement.create({
        data: {
          contractorBoqId: boq1.id,
          sequenceNumber: seq + 1,
          runningNumber: seq + 1,
          label: `خلاصة رقم ${seq + 1}`,
          insurancePercent: 5,
          extractDate: new Date(startDate.getTime() + s * 30 * 86400000),
          previousPaid: prevPaid,
          totalWorkValue,
          totalDeductions: insurance,
          netPayable,
          status: s === numStatements ? (def.scenario === 'healthy' ? 'running' : 'running') : 'running',
        },
      });
      await prisma.statementItem.createMany({
        data: items.map((i) => ({ ...i, statementId: stmt.id })),
      });
      await prisma.statementDeduction.create({
        data: { statementId: stmt.id, type: DeductionTypeEnum.INSURANCE, amount: insurance },
      });
      // Payments
      const payFactor = def.scenario === 'healthy' ? 0.9 : def.scenario === 'loss' ? 0.5 : 0.7;
      const payAmount = round2(netPayable * payFactor);
      await prisma.payment.create({
        data: {
          statementId: stmt.id,
          buildingId: building.id,
          contractorId: mainContractor.id,
          amount: payAmount,
          paidAt: new Date(startDate.getTime() + s * 30 * 86400000 + 5 * 86400000),
        },
      });
      prevPaid += netPayable;
    }

    // BOQ2 statements (fewer)
    for (let s = 1; s <= 3; s++) {
      const seq = runningByBoq.get(boq2.id) ?? 0;
      runningByBoq.set(boq2.id, seq + 1);
      const items = boq2Items.map((ci) => ({
        statementId: '',
        contractorBoqItemId: ci.id,
        itemCode: ci.itemCode,
        description: ci.description,
        unit: ci.unit,
        contractQuantity: num(ci.assignedQuantity),
        previousQuantity: round2(num(ci.assignedQuantity) * ((s - 1) * 0.12)),
        currentQuantity: round2(num(ci.assignedQuantity) * 0.12),
        totalQuantity: round2(num(ci.assignedQuantity) * s * 0.12),
        executionPercent: round2(s * 12),
        totalExecuted: round2(num(ci.assignedQuantity) * s * 0.12),
        unitPrice: num(ci.unitPrice),
        currentWorkValue: round2(num(ci.assignedQuantity) * 0.12 * num(ci.unitPrice)),
      }));
      const totalWorkValue = round2(items.reduce((acc, i) => acc + i.currentWorkValue, 0));
      const netPayable = round2(totalWorkValue - round2(totalWorkValue * 0.05));
      const stmt = await prisma.statement.create({
        data: {
          contractorBoqId: boq2.id,
          sequenceNumber: seq + 1,
          runningNumber: seq + 1,
          label: `خلاصة كهرباء ${seq + 1}`,
          insurancePercent: 5,
          extractDate: new Date(startDate.getTime() + s * 45 * 86400000),
          totalWorkValue,
          totalDeductions: round2(totalWorkValue * 0.05),
          netPayable,
          status: 'running',
        },
      });
      await prisma.statementItem.createMany({
        data: items.map((i) => ({ ...i, statementId: stmt.id })),
      });
      await prisma.payment.create({
        data: {
          statementId: stmt.id,
          buildingId: building.id,
          contractorId: specContractor.id,
          amount: round2(netPayable * 0.7),
          paidAt: new Date(startDate.getTime() + s * 45 * 86400000 + 5 * 86400000),
        },
      });
    }

    // ----- Purchases -----
    const purchaseStatuses = ['received', 'received', 'received', 'approved', 'pending', 'cancelled'];
    for (let p = 0; p < 15; p++) {
      const supplier = suppliers[rint(0, suppliers.length - 1)];
      const mat = MATERIAL_ITEMS[p % MATERIAL_ITEMS.length];
      const qty = rint(5, 50);
      const unitPrice = rint(80, 800);
      const status = purchaseStatuses[p % purchaseStatuses.length];
      const daysAgo = rint(3, 300);
      const date = new Date(Date.now() - daysAgo * 86400000);
      await prisma.purchase.create({
        data: {
          projectId: project.id,
          buildingId: building.id,
          supplierId: supplier.id,
          supplierName: supplier.name,
          itemName: mat.name,
          quantity: qty,
          unit: mat.unit,
          unitPrice,
          total: round2(qty * unitPrice),
          date,
          status,
          notes: status === 'cancelled' ? 'ملغي - استبدال المورد' : '',
        },
      });
    }

    // ----- Miscellaneous -----
    for (let m = 0; m < 2; m++) {
      await prisma.miscellaneous.create({
        data: {
          projectId: project.id,
          description: m === 0 ? 'أجور نقل وترحيل مواد' : 'تغذية عمال الموقع',
          amount: rint(2000, 15000),
          category: m === 0 ? 'transport' : 'food',
          date: new Date(Date.now() - rint(5, 120) * 86400000),
        },
      });
    }
  }

  // ----- Fund transactions -----
  const txns: any[] = [];
  const clientCollection = def.scenario === 'healthy' ? 2_500_000 : def.scenario === 'loss' ? 400_000 : 1_200_000;
  // initial add + periodic client collections
  txns.push({ fundId: fund.id, type: 'add', category: 'initial', amount: initialBalance, description: 'رأس مال المشروع', date: startDate, status: 'approved' });
  for (let i = 1; i <= 8; i++) {
    txns.push({ fundId: fund.id, type: 'add', category: 'client', amount: clientCollection, description: 'تحصيل مستخلص عميل', date: new Date(startDate.getTime() + i * 30 * 86400000), status: 'approved' });
  }
  // deducts: payments, purchases, misc
  for (let i = 1; i <= 18; i++) {
    txns.push({ fundId: fund.id, type: 'deduct', category: 'payment', amount: rint(400_000, 1_200_000), description: 'دفعة مقاول', date: new Date(startDate.getTime() + i * 30 * 86400000), status: 'approved' });
  }
  for (let i = 0; i < 40; i++) {
    txns.push({ fundId: fund.id, type: 'deduct', category: 'purchase', amount: rint(40_000, 300_000), description: 'أمر شراء مواد', date: new Date(Date.now() - rint(3, 280) * 86400000), status: 'approved' });
  }
  for (let i = 0; i < 12; i++) {
    txns.push({ fundId: fund.id, type: 'deduct', category: 'general', amount: rint(15_000, 80_000), description: 'مصروفات متنوعة', date: new Date(Date.now() - rint(3, 280) * 86400000), status: 'approved' });
  }
  // pending requests
  for (let i = 0; i < 3; i++) {
    txns.push({ fundId: fund.id, type: 'request', category: 'general', amount: rint(50_000, 200_000), description: 'طلب صرف', date: new Date(), status: 'pending' });
  }
  await prisma.fundTransaction.createMany({ data: txns });

  // fund currentBalance = initial + adds - deducts (approved)
  const approved = txns.filter((t) => t.status === 'approved');
  const balance = approved.reduce((acc, t) => acc + (t.type === 'add' ? t.amount : t.type === 'deduct' ? -t.amount : 0), 0);
  await prisma.projectFund.update({ where: { id: fund.id }, data: { currentBalance: round2(balance) } });

  // ----- Client / subcontractor statements -----
  const buildings = await prisma.building.findMany({ where: { projectId: project.id } });
  let cstTotal = 0;
  for (let i = 1; i <= 4; i++) {
    const value = def.scenario === 'healthy' ? 3_000_000 : def.scenario === 'loss' ? 800_000 : 1_800_000;
    cstTotal += value;
    const b = buildings[i % buildings.length];
    await prisma.clientStatement.create({
      data: {
        statementNumber: `CS-${def.code}-${i}`,
        projectId: project.id,
        projectName: def.name,
        buildingId: b.id,
        buildingName: b.name,
        clientId: client.id,
        clientName: def.client,
        date: new Date(startDate.getTime() + i * 30 * 86400000),
        status: 'approved',
        totalWorkValue: value,
        totalDeductions: round2(value * 0.1),
        netPayable: round2(value * 0.9),
      },
    });
  }
  for (let i = 1; i <= 3; i++) {
    const b = buildings[i % buildings.length];
    await prisma.subcontractorStatement.create({
      data: {
        statementNumber: `SS-${def.code}-${i}`,
        projectId: project.id,
        projectName: def.name,
        buildingId: b.id,
        buildingName: b.name,
        subcontractorId: buildings[i % buildings.length].id,
        subcontractorName: 'مقاول أعمال عامة',
        workType: 'أعمال عامة',
        date: new Date(startDate.getTime() + i * 30 * 86400000),
        status: 'approved',
        insurancePercent: 5,
        totalWorkValue: 1_200_000,
        totalInsurance: 60_000,
        totalDeductions: 60_000,
        previousPaid: 900_000,
        netPayable: 240_000,
      },
    });
  }

  // ----- Pending approvals -----
  for (let i = 0; i < (def.scenario === 'loss' ? 6 : 2); i++) {
    await prisma.approval.create({
      data: {
        entityType: 'purchase',
        entityId: `seed-${def.code}-${i}`,
        status: 'pending',
        requestedBy: 'seed',
      },
    });
  }

  console.log(`SEEDED ${def.code} (${def.scenario}) - ${def.buildings.length} buildings`);
}

// ---------------------------------------------------------------------------
// Global topping-up
// ---------------------------------------------------------------------------
async function seedGlobal() {
  const contractors = await getOrCreateContractors();
  const suppliers = await getOrCreateSuppliers();
  const clients = await getOrCreateClients();
  const departments = await getOrCreateDepartments();
  const warehouses = await getOrCreateWarehouses();
  const categories = await getOrCreateCategories();

  // ----- Employees -----
  const empCount = await prisma.employee.count({ where: { deletedAt: null } });
  if (empCount < 100) {
    const need = 100 - empCount;
    const existingCodes = new Set((await prisma.employee.findMany({ select: { code: true } })).map((e) => e.code));
    let codeNum = 1000;
    const employees: any[] = [];
    while (employees.length < need) {
      const code = `EMP${codeNum++}`;
      if (existingCodes.has(code)) continue;
      employees.push({
        code,
        fullName: `${FIRST_NAMES[rint(0, FIRST_NAMES.length - 1)]} ${LAST_NAMES[rint(0, LAST_NAMES.length - 1)]}`,
        nationalId: `${rint(10000000000000, 99999999999999)}`,
        phone: `01${rint(0, 5)}${String(rint(10000000, 99999999))}`,
        departmentId: departments[rint(0, departments.length - 1)].id,
        salary: rint(4000, 45000),
        hireDate: new Date(2023, rint(0, 11), rint(1, 28)),
        status: 'active',
      });
    }
    await prisma.employee.createMany({ data: employees });
    console.log(`SEEDED ${need} employees`);
  }

  // ----- Attendance (project-scoped) -----
  const projects = await prisma.project.findMany({ where: { deletedAt: null } });
  const employees = await prisma.employee.findMany({ where: { deletedAt: null, status: 'active' } });
  let projIdx = 0;
  for (const proj of projects) {
    const projEmployees = employees.slice(projIdx * 20, projIdx * 20 + 30);
    projIdx++;
    const buildings = await prisma.building.findMany({ where: { projectId: proj.id } });
    const existing = await prisma.attendance.count({ where: { projectId: proj.id } });
    const target = 500;
    let created = 0;
    const rows: any[] = [];
    const used = new Set<string>();
    for (let day = 0; day < 45 && created < target; day++) {
      const date = new Date(Date.now() - day * 86400000);
      if (date.getDay() === 5 || date.getDay() === 6) continue; // skip Fri/Sat
      for (const e of projEmployees) {
        if (created >= target) break;
        const key = `${e.id}-${date.toISOString().slice(0, 10)}`;
        if (used.has(key)) continue;
        used.add(key);
        const roll = rand();
        const attendanceStatus = roll < 0.7 ? 'checkedOut' : roll < 0.85 ? 'late' : roll < 0.93 ? 'absent' : 'checkedOut';
        const workedMinutes = attendanceStatus === 'absent' ? null : rint(450, 560);
        rows.push({
          employeeId: e.id,
          date,
          projectId: proj.id,
          buildingId: buildings.length > 0 ? buildings[day % buildings.length].id : undefined,
          attendanceStatus,
          status: attendanceStatus === 'late' ? 'late' : attendanceStatus === 'absent' ? 'absent' : 'present',
          workedMinutes,
          hoursWorked: 0,
          checkInTime: new Date(date.getTime() + 8 * 3600000),
          checkOutTime: new Date(date.getTime() + 17 * 3600000),
        });
        created++;
      }
    }
    if (rows.length > 0) {
      await prisma.attendance.createMany({ data: rows, skipDuplicates: true });
      console.log(`SEEDED ${rows.length} attendance for ${proj.code}`);
    }
  }

  // ----- Inventory + stock movements -----
  const invCount = await prisma.inventoryItem.count({ where: { deletedAt: null } });
  if (invCount < 60) {
    const need = 60 - invCount;
    const existingCodes = new Set((await prisma.inventoryItem.findMany({ select: { code: true } })).map((i) => i.code));
    const items: any[] = [];
    let n = 1;
    while (items.length < need) {
      const code = `INV${String(n).padStart(4, '0')}`;
      n++;
      if (existingCodes.has(code)) continue;
      const mat = MATERIAL_ITEMS[items.length % MATERIAL_ITEMS.length];
      items.push({
        code,
        name: mat.name,
        unit: mat.unit,
        categoryId: categories[items.length % categories.length].id,
        warehouseId: warehouses[items.length % warehouses.length].id,
        quantity: rint(20, 400),
        minQuantity: rint(10, 60),
        price: rint(80, 800),
        status: 'active',
      });
    }
    await prisma.inventoryItem.createMany({ data: items });
    console.log(`SEEDED ${need} inventory items`);

    // stock movements
    const allItems = await prisma.inventoryItem.findMany({ where: { deletedAt: null } });
    const mvCount = await prisma.stockMovement.count();
    let movements: any[] = [];
    let mm = 0;
    const targetMv = 500;
    while (mvCount + movements.length < targetMv) {
      const item = allItems[mm % allItems.length];
      const type = mm % 3 === 0 ? 'RECEIVE' : 'ISSUE';
      movements.push({
        itemId: item.id,
        type,
        quantity: rint(2, 40),
        date: new Date(Date.now() - rint(1, 180) * 86400000),
        reference: type === 'RECEIVE' ? `GRN-${mm}` : `MR-${mm}`,
        notes: type === 'RECEIVE' ? 'استلام مورد' : 'صرف للموقع',
      });
      mm++;
    }
    if (movements.length > 0) {
      await prisma.stockMovement.createMany({ data: movements });
      console.log(`SEEDED ${movements.length} stock movements`);
    }
  }

  return { contractors, suppliers, clients };
}

// ---------------------------------------------------------------------------
// Cleanup of previously seeded verification data (idempotent re-runs)
// ---------------------------------------------------------------------------
async function cleanup() {
  const codes = PROJECT_DEFS.map((p) => p.code);
  const projects = await prisma.project.findMany({ where: { code: { in: codes } } });
  const pids = projects.map((p) => p.id);
  const buildings = await prisma.building.findMany({ where: { projectId: { in: pids } } });
  const bids = buildings.map((b) => b.id);
  const contractorBoqs = await prisma.contractorBoq.findMany({ where: { buildingId: { in: bids } } });
  const cboqIds = contractorBoqs.map((c) => c.id);
  const stmtIds = (await prisma.statement.findMany({ where: { contractorBoqId: { in: cboqIds } } })).map((s) => s.id);

  await prisma.statementItem.deleteMany({ where: { statementId: { in: stmtIds } } });
  await prisma.statementDeduction.deleteMany({ where: { statementId: { in: stmtIds } } });
  await prisma.payment.deleteMany({ where: { buildingId: { in: bids } } });
  await prisma.statement.deleteMany({ where: { id: { in: stmtIds } } });
  await prisma.contractorBoqItemVersion.deleteMany({ where: { contractorBoqItem: { contractorBoqId: { in: cboqIds } } } });
  await prisma.contractorBoqItem.deleteMany({ where: { contractorBoqId: { in: cboqIds } } });
  await prisma.contractorBoq.deleteMany({ where: { id: { in: cboqIds } } });
  await prisma.buildingSubcontractor.deleteMany({ where: { buildingId: { in: bids } } });

  const finalBoqs = await prisma.finalBoq.findMany({ where: { projectId: { in: pids } } });
  const fboqIds = finalBoqs.map((f) => f.id);
  const finalItemIds = (await prisma.finalBoqItem.findMany({ where: { finalBoqId: { in: fboqIds } } })).map((i) => i.id);
  await prisma.distributionRow.deleteMany({ where: { distribution: { finalBoqId: { in: fboqIds } } } });
  await prisma.distribution.deleteMany({ where: { finalBoqId: { in: fboqIds } } });
  await prisma.component.deleteMany({ where: { finalBoqItemId: { in: finalItemIds } } });
  await prisma.finalBoqItem.deleteMany({ where: { id: { in: finalItemIds } } });
  await prisma.finalBoq.deleteMany({ where: { id: { in: fboqIds } } });
  await prisma.analyticalBoqItem.deleteMany({ where: { buildingId: { in: bids } } });
  await prisma.employerBoqItem.deleteMany({ where: { buildingId: { in: bids } } });

  await prisma.attendance.deleteMany({ where: { projectId: { in: pids } } });
  await prisma.clientStatement.deleteMany({ where: { projectId: { in: pids } } });
  await prisma.subcontractorStatement.deleteMany({ where: { projectId: { in: pids } } });
  await prisma.miscellaneous.deleteMany({ where: { projectId: { in: pids } } });
  await prisma.purchase.deleteMany({ where: { projectId: { in: pids } } });
  const fundIds = (await prisma.projectFund.findMany({ where: { projectId: { in: pids } } })).map((f) => f.id);
  await prisma.fundTransaction.deleteMany({ where: { fundId: { in: fundIds } } });
  await prisma.projectFund.deleteMany({ where: { id: { in: fundIds } } });
  await prisma.approval.deleteMany({ where: { entityId: { startsWith: 'seed-' } } });
  await prisma.projectBoard.deleteMany({ where: { buildingId: { in: bids } } });
  await prisma.building.deleteMany({ where: { id: { in: bids } } });
  await prisma.project.deleteMany({ where: { id: { in: pids } } });

  // Global seeded entities
  await prisma.supplier.deleteMany({ where: { name: { in: NEW_SUPPLIERS.map((s) => s.name) } } });
  await prisma.subcontractor.deleteMany({ where: { name: { in: NEW_CONTRACTORS.map((c) => c.name) } } });
  await prisma.client.deleteMany({ where: { name: { in: CLIENT_NAMES.map((c) => c.name) } } });
  const empIds = (await prisma.employee.findMany({ where: { code: { startsWith: 'EMP' } } })).map((e) => e.id);
  await prisma.attendance.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.leave.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.employeeShift.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.employee.deleteMany({ where: { id: { in: empIds } } });
  const invItemIds = (await prisma.inventoryItem.findMany({ where: { code: { startsWith: 'INV' } } })).map((i) => i.id);
  await prisma.stockMovement.deleteMany({ where: { itemId: { in: invItemIds } } });
  await prisma.inventoryItem.deleteMany({ where: { id: { in: invItemIds } } });
  await prisma.department.deleteMany({ where: { code: { in: NEW_DEPARTMENTS.map((d) => d.code) } } });
  await prisma.warehouse.deleteMany({ where: { code: { in: NEW_WAREHOUSES.map((w) => w.code) } } });
  await prisma.category.deleteMany({ where: { code: { in: NEW_CATEGORIES.map((c) => c.code) } } });

  console.log('CLEANED seeded verification data');
}

async function main() {
  if (process.argv.includes('--clean')) {
    await cleanup();
    return;
  }
  const globals = await seedGlobal();
  for (const def of PROJECT_DEFS) {
    await seedProject(def, globals.contractors, globals.suppliers, globals.clients);
  }
  console.log('DONE');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
