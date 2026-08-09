import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('Cleaning existing data...');

  await prisma.signatureAction.deleteMany();
  await prisma.signatureRequest.deleteMany();
  await prisma.signatureWorkflowStep.deleteMany();
  await prisma.signatureWorkflow.deleteMany();
  await prisma.attendanceOverride.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.employeeShift.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.employeeRole.deleteMany();
  await prisma.userProjectAssignment.deleteMany();
  await prisma.userRoleAssignment.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.document.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.fileRecord.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.settingChangeLog.deleteMany();
  await prisma.eventStoreRecord.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.clientStatement.deleteMany();
  await prisma.subcontractorStatement.deleteMany();
  await prisma.statementItem.deleteMany();
  await prisma.statementDeduction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.statement.deleteMany();
  await prisma.contractorBoqItemVersion.deleteMany();
  await prisma.contractorBoqItem.deleteMany();
  await prisma.contractorBoq.deleteMany();
  await prisma.distributionRow.deleteMany();
  await prisma.distribution.deleteMany();
  await prisma.component.deleteMany();
  await prisma.finalBoqItem.deleteMany();
  await prisma.finalBoq.deleteMany();
  await prisma.analyticalBoqItem.deleteMany();
  await prisma.employerBoqItem.deleteMany();
  await prisma.boqCodeCounter.deleteMany();
  await prisma.buildingSubcontractor.deleteMany();
  await prisma.building.deleteMany();
  await prisma.subcontractor.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.miscellaneous.deleteMany();
  await prisma.fundTransaction.deleteMany();
  await prisma.projectFund.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.company.deleteMany();

  console.log('Creating company...');
  const company = await prisma.company.create({
    data: {
      name: 'Al Wataniya for Construction',
      arabicName: 'الوطنية للمقاولات',
      address: '15 El Tahrir Street, Dokki, Giza, Egypt',
      phone: '+20 2 333 456 78',
      email: 'info@elwataniya.com',
      taxNumber: '123-456-789',
      commercialRegister: 'CR-2025-00123',
      primaryColor: '#1e40af',
      secondaryColor: '#64748b',
      currency: 'EGP',
      watermark: 'AL WATANIYA FOR CONSTRUCTION',
    },
  });

  console.log('Creating project...');
  const project = await prisma.project.create({
    data: {
      name: 'New Administrative Capital - Phase 2',
      code: 'NAC-P2-2025',
      location: 'New Administrative Capital, Egypt',
      client: 'Ministry of Housing',
      status: 'active',
      progress: 65,
      description:
        'Construction of 12 residential towers and infrastructure in the New Administrative Capital',
    },
  });

  console.log('Creating building...');
  const building = await prisma.building.create({
    data: {
      projectId: project.id,
      name: 'Residential Tower A',
      code: 'TOWER-A',
      type: 'Residential - 20 floors',
      status: 'active',
    },
  });

  const units = ['m³', 'm²', 'ton', 'unit', 'm', 'kg', 'L', 'pc'];
  const statuses = ['pending', 'approved', 'delivered'];
  const poStatuses = ['pending', 'approved', 'received', 'cancelled'];

  // ---- Employer BOQ Items ----
  console.log('Creating 500 Employer BOQ items...');
  const employerItems: any[] = [];
  const boqItemTemplates = generateBoqTemplates();
  for (let i = 0; i < 500; i++) {
    const tpl = boqItemTemplates[i % boqItemTemplates.length];
    const qty = rand(tpl.qtyMin, tpl.qtyMax);
    const up = randFloat(tpl.priceMin, tpl.priceMax);
    employerItems.push({
      buildingId: building.id,
      itemCode: tpl.codePrefix + '-' + String(i + 1).padStart(3, '0'),
      description: pick(tpl.descriptions),
      unit: tpl.unit,
      quantity: qty,
      unitPrice: up,
      totalValue: parseFloat((qty * up).toFixed(2)),
    });
  }
  await prisma.employerBoqItem.createMany({ data: employerItems });

  // ---- Analytical BOQ Items ----
  console.log('Creating 500 Analytical BOQ items...');
  const analyticalItems: any[] = [];
  for (let i = 0; i < 500; i++) {
    const tpl = boqItemTemplates[i % boqItemTemplates.length];
    const qty = rand(tpl.qtyMin, tpl.qtyMax);
    const up = randFloat(tpl.priceMin, tpl.priceMax);
    analyticalItems.push({
      buildingId: building.id,
      itemCode: tpl.codePrefix + '-' + String(i + 1).padStart(3, '0'),
      description: pick(tpl.descriptions),
      unit: tpl.unit,
      quantity: qty,
      unitPrice: up,
      totalValue: parseFloat((qty * up).toFixed(2)),
    });
  }
  await prisma.analyticalBoqItem.createMany({ data: analyticalItems });

  // ---- Final BOQs ----
  console.log('Creating 3 Final BOQs...');
  const finalBoqs: any[] = [];
  for (let v = 1; v <= 3; v++) {
    const fb = await prisma.finalBoq.create({
      data: {
        buildingId: building.id,
        projectId: project.id,
        businessCode: `FBQ-TOWER-A-V${v}`,
        version: v,
        status: 'approved',
      },
    });
    finalBoqs.push(fb);

    const itemCount = v === 1 ? 100 : v === 2 ? 150 : 200;
    const items: any[] = [];
    for (let i = 0; i < itemCount; i++) {
      const tpl = boqItemTemplates[i % boqItemTemplates.length];
      const qty = rand(tpl.qtyMin, tpl.qtyMax);
      const up = randFloat(tpl.priceMin, tpl.priceMax);
      items.push({
        finalBoqId: fb.id,
        businessCode: `FBQ-ITEM-${String(i + 1).padStart(4, '0')}`,
        description: pick(tpl.descriptions),
        unit: tpl.unit,
        quantity: qty,
        unitPrice: up,
        totalValue: parseFloat((qty * up).toFixed(2)),
        itemStatus: 'pending',
        sortOrder: i + 1,
        version: v,
      });
    }
    await prisma.finalBoqItem.createMany({ data: items });
  }

  // ---- Subcontractors ----
  console.log('Creating 5 Subcontractors...');
  const subcontractorData = [
    { name: 'Misr Steel Structures Co.', workType: 'Structural', phone: '+20 2 1234 5678', email: 'info@misrsteel.com', address: '10 Abbas El Akkad, Nasr City, Cairo' },
    { name: 'El Nile Mechanical Works', workType: 'Mechanical', phone: '+20 2 2345 6789', email: 'info@elnilemech.com', address: '25 El Tahrir St, Dokki, Giza' },
    { name: 'Cairo Electrical Contracting', workType: 'Electrical', phone: '+20 2 3456 7890', email: 'info@cairoelec.com', address: '5 El Mokatam St, Maadi, Cairo' },
    { name: 'Alex Finishing & Decoration', workType: 'Finishing', phone: '+20 3 4567 8901', email: 'info@alexfinish.com', address: '15 El Geish St, Alexandria' },
    { name: 'Green Landscaping Services', workType: 'Landscaping', phone: '+20 2 5678 9012', email: 'info@greenland.com', address: '8 El Nahda St, 6th October City' },
  ];
  const subcontractors: any[] = [];
  for (const sd of subcontractorData) {
    const sub = await prisma.subcontractor.create({
      data: {
        name: sd.name,
        workType: sd.workType,
        marginType: 'percentage',
        marginValue: randFloat(5, 15),
        phone: sd.phone,
        email: sd.email,
        address: sd.address,
        joinDate: new Date('2025-01-01'),
        status: 'active',
      },
    });
    subcontractors.push(sub);

    await prisma.buildingSubcontractor.create({
      data: {
        buildingId: building.id,
        subcontractorId: sub.id,
        workType: sd.workType,
        agreedPrice: randFloat(500000, 5000000),
        status: 'active',
      },
    });
  }

  // ---- Contractor BOQs ----
  console.log('Creating 5 Contractor BOQs...');
  for (const sub of subcontractors) {
    const cb = await prisma.contractorBoq.create({
      data: {
        buildingId: building.id,
        subcontractorId: sub.id,
        workType: sub.workType,
        version: 1,
        status: 'Approved',
      },
    });

    const itemCount = rand(50, 100);
    const items: any[] = [];
    for (let i = 0; i < itemCount; i++) {
      const tpl = boqItemTemplates[i % boqItemTemplates.length];
      const qty = rand(tpl.qtyMin, tpl.qtyMax);
      const up = randFloat(tpl.priceMin, tpl.priceMax);
      items.push({
        contractorBoqId: cb.id,
        itemCode: `CTR-${sub.workType.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        description: pick(tpl.descriptions),
        unit: tpl.unit,
        quantity: qty,
        assignedQuantity: qty,
        unitPrice: up,
        totalValue: parseFloat((qty * up).toFixed(2)),
        version: 1,
      });
    }
    await prisma.contractorBoqItem.createMany({ data: items });
  }

  // ---- Statements (Extracts) ----
  console.log('Creating 10 Statements...');
  const allContractorBoqs = await prisma.contractorBoq.findMany({
    where: { buildingId: building.id },
    include: { items: true },
  });

  for (let s = 0; s < 10; s++) {
    const cb = pick(allContractorBoqs);
    const cbItems = cb.items;
    const seq = s + 1;
    const statement = await prisma.statement.create({
      data: {
        contractorBoqId: cb.id,
        sequenceNumber: seq,
        status: seq === 10 ? 'final' : 'running',
        runningNumber: seq,
        label: `${cb.subcontractorId.substring(0, 8)}-Extract #${seq}`,
        insurancePercent: 5,
        extractDate: new Date(2025, 0, 15 + s * 15),
        previousPaid: s > 0 ? randFloat(100000, 500000) : 0,
      },
    });

    const itemCount = rand(20, 50);
    let totalWork = 0;
    const statementItems: any[] = [];
    for (let i = 0; i < Math.min(itemCount, cbItems.length); i++) {
      const cbi = cbItems[i];
      const prevQty = rand(0, Math.floor(Number(cbi.quantity) * 0.5));
      const currQty = rand(10, Math.floor(Number(cbi.quantity) * 0.3));
      const totalQty = prevQty + currQty;
      const execPct = Math.min(100, Math.round((totalQty / Number(cbi.quantity)) * 100));
      const executed = parseFloat((totalQty * Number(cbi.unitPrice)).toFixed(2));
      const currWork = parseFloat((currQty * Number(cbi.unitPrice)).toFixed(2));
      totalWork += currWork;
      statementItems.push({
        statementId: statement.id,
        contractorBoqItemId: cbi.id,
        itemCode: cbi.itemCode,
        description: cbi.description,
        unit: cbi.unit,
        contractQuantity: Number(cbi.quantity),
        previousQuantity: prevQty,
        currentQuantity: currQty,
        totalQuantity: totalQty,
        executionPercent: execPct,
        totalExecuted: executed,
        unitPrice: Number(cbi.unitPrice),
        currentWorkValue: currWork,
      });
    }
    await prisma.statementItem.createMany({ data: statementItems });

    const deductions = [
      { type: 'INSURANCE' as const, amount: parseFloat((totalWork * 0.05).toFixed(2)) },
      { type: 'TAXES' as const, amount: parseFloat((totalWork * 0.025).toFixed(2)) },
      { type: 'RETENTION' as const, amount: parseFloat((totalWork * 0.1).toFixed(2)) },
    ];
    await prisma.statementDeduction.createMany({
      data: deductions.map((d) => ({ statementId: statement.id, type: d.type, amount: d.amount })),
    });

    const totalDed = deductions.reduce((s, d) => s + d.amount, 0);
    await prisma.statement.update({
      where: { id: statement.id },
      data: {
        totalWorkValue: parseFloat(totalWork.toFixed(2)),
        totalDeductions: parseFloat(totalDed.toFixed(2)),
        netPayable: parseFloat((totalWork - totalDed).toFixed(2)),
      },
    });
  }

  // ---- Client Statements ----
  console.log('Creating 5 Client Statements...');
  for (let i = 1; i <= 5; i++) {
    const totalWork = randFloat(500000, 2000000);
    const deductions = [
      { type: 'TAXES' as const, label: 'Taxes 2.5%', amount: parseFloat((totalWork * 0.025).toFixed(2)) },
      { type: 'RETENTION' as const, label: 'Retention 10%', amount: parseFloat((totalWork * 0.1).toFixed(2)) },
      { type: 'INSURANCE' as const, label: 'Insurance 5%', amount: parseFloat((totalWork * 0.05).toFixed(2)) },
      { type: 'PREVIOUS_PAYMENTS' as const, label: 'Previous Payments', amount: randFloat(100000, 500000) },
    ];
    const totalDed = deductions.reduce((s, d) => s + d.amount, 0);
    const netPay = parseFloat((totalWork - totalDed).toFixed(2));

    await prisma.clientStatement.create({
      data: {
        statementNumber: `CS-NAC-P2-${String(i).padStart(3, '0')}`,
        projectId: project.id,
        projectName: project.name,
        buildingId: building.id,
        buildingName: 'Residential Tower A',
        clientId: 'ministry-of-housing',
        clientName: 'Ministry of Housing',
        date: new Date(2025, i - 1, 15),
        status: i <= 3 ? 'approved' : 'pending',
        totalWorkValue: totalWork,
        totalDeductions: totalDed,
        netPayable: netPay,
        items: [
          { description: 'Concrete Works', amount: totalWork * 0.35, unit: 'm³', quantity: rand(500, 3000) },
          { description: 'Steel Works', amount: totalWork * 0.25, unit: 'ton', quantity: rand(50, 200) },
          { description: 'Finishing Works', amount: totalWork * 0.2, unit: 'm²', quantity: rand(1000, 5000) },
          { description: 'Electrical Works', amount: totalWork * 0.1, unit: 'unit', quantity: rand(100, 500) },
          { description: 'Plumbing Works', amount: totalWork * 0.1, unit: 'unit', quantity: rand(50, 200) },
        ],
        deductions: deductions,
        signatures: [],
      },
    });
  }

  // ---- Subcontractor Statements ----
  console.log('Creating 5 Subcontractor Statements...');
  for (let i = 1; i <= 5; i++) {
    const sub = pick(subcontractors);
    const totalWork = randFloat(200000, 1000000);
    const insurance = parseFloat((totalWork * 0.05).toFixed(2));
    const deductions = [
      { type: 'TAXES' as const, label: 'Taxes 2.5%', amount: parseFloat((totalWork * 0.025).toFixed(2)) },
      { type: 'RETENTION' as const, label: 'Retention 10%', amount: parseFloat((totalWork * 0.1).toFixed(2)) },
      { type: 'PENALTIES' as const, label: 'Delay Penalty', amount: randFloat(1000, 10000) },
    ];
    const totalDed = deductions.reduce((s, d) => s + d.amount + insurance, 0);
    const prevPaid = i > 1 ? randFloat(50000, 300000) : 0;
    const netPay = parseFloat((totalWork - totalDed - prevPaid).toFixed(2));

    await prisma.subcontractorStatement.create({
      data: {
        statementNumber: `SS-NAC-${sub.workType.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`,
        projectId: project.id,
        projectName: project.name,
        buildingId: building.id,
        buildingName: 'Residential Tower A',
        subcontractorId: sub.id,
        subcontractorName: sub.name,
        workType: sub.workType,
        date: new Date(2025, i * 2 - 1, 20),
        status: 'approved',
        blockNumber: `B-${i}`,
        formNumber: `F-${String(i).padStart(3, '0')}`,
        insurancePercent: 5,
        totalWorkValue: totalWork,
        totalInsurance: insurance,
        totalDeductions: totalDed,
        previousPaid: prevPaid,
        netPayable: Math.max(0, netPay),
        runningNumber: i,
        items: [
          { description: 'Work Item 1', amount: totalWork * 0.4, unit: pick(units), quantity: rand(100, 1000) },
          { description: 'Work Item 2', amount: totalWork * 0.35, unit: pick(units), quantity: rand(50, 500) },
          { description: 'Work Item 3', amount: totalWork * 0.25, unit: pick(units), quantity: rand(20, 200) },
        ],
        deductions: deductions,
        signatures: [],
      },
    });
  }

  // ---- Purchase Orders ----
  console.log('Creating 100 Purchase Orders...');
  const supplierNames = [
    'El Sewedy Electric', 'Ezz Steel', 'Lafarge Cement', 'Misr Ceramics',
    'Sika Egypt', 'Jotun Paints', 'Ghabbour Auto', 'Oriental Weavers',
  ];
  const materialNames = [
    'Portland Cement 50kg', 'Steel Rebars 16mm', 'Ceramic Tiles 40x40',
    'PVC Pipes 4"', 'Electrical Cables 6mm²', 'Paint Interior White',
    'Sand Fine Aggregate', 'Coarse Aggregate 1"',
    'Bricks Red 6x12x25', 'Timber Plywood 18mm',
  ];
  const poItems: any[] = [];
  for (let i = 0; i < 100; i++) {
    const qty = rand(10, 500);
    const up = randFloat(20, 5000);
    poItems.push({
      projectId: project.id,
      buildingId: building.id,
      itemName: pick(materialNames),
      quantity: qty,
      unit: pick(units),
      unitPrice: up,
      total: parseFloat((qty * up).toFixed(2)),
      date: new Date(2025, rand(0, 5), rand(1, 28)),
      status: pick(poStatuses),
      notes: `Purchase order #${i + 1}`,
      supplierName: pick(supplierNames),
      createdBy: 'seed-script',
    });
  }
  await prisma.purchase.createMany({ data: poItems });

  // ---- Payments ----
  console.log('Creating 50 Payments...');
  const paymentItems: any[] = [];
  for (let i = 0; i < 50; i++) {
    paymentItems.push({
      amount: randFloat(5000, 500000),
      paidAt: new Date(2025, rand(0, 5), rand(1, 28)),
      notes: `Payment #${i + 1}`,
    });
  }
  await prisma.payment.createMany({ data: paymentItems });

  // ---- Project Fund ----
  console.log('Creating Project Fund...');
  const fund = await prisma.projectFund.create({
    data: {
      projectId: project.id,
      initialBalance: 50000000,
      currentBalance: 32000000,
    },
  });

  // ---- Fund Transactions ----
  console.log('Creating 100 Fund Transactions...');
  const incomeCategories = ['client_payment', 'advance_payment', 'retention_return', 'interest'];
  const expenseCategories = ['purchase', 'salary', 'equipment', 'miscellaneous', 'subcontractor'];
  const txItems: any[] = [];
  for (let i = 0; i < 100; i++) {
    const isIncome = i < 40;
    const type = isIncome ? 'add' : 'deduct';
    const category = pick(isIncome ? incomeCategories : expenseCategories);
    const amount = isIncome ? randFloat(100000, 2000000) : randFloat(10000, 500000);
    txItems.push({
      fundId: fund.id,
      type,
      category,
      amount: parseFloat(amount.toFixed(2)),
      description: `${isIncome ? 'Income' : 'Expense'} - ${category} #${i + 1}`,
      date: new Date(2025, rand(0, 5), rand(1, 28)),
      status: 'approved',
      notes: `Transaction #${i + 1}`,
      createdBy: 'seed-script',
    });
  }
  await prisma.fundTransaction.createMany({ data: txItems });

  // ---- Categories ----
  console.log('Creating categories...');
  const categoryData = [
    { code: 'CEM', name: 'Cement & Binders' },
    { code: 'STL', name: 'Steel & Reinforcement' },
    { code: 'CER', name: 'Ceramics & Tiles' },
    { code: 'PLM', name: 'Plumbing Materials' },
    { code: 'ELE', name: 'Electrical Materials' },
    { code: 'PNT', name: 'Paints & Coatings' },
    { code: 'AGG', name: 'Aggregates & Sand' },
    { code: 'TIM', name: 'Timber & Wood' },
    { code: 'GLZ', name: 'Glass & Windows' },
    { code: 'HWD', name: 'Hardware & Tools' },
  ];
  const categories: any[] = [];
  for (const cd of categoryData) {
    const cat = await prisma.category.create({ data: cd });
    categories.push(cat);
  }

  // ---- Warehouse ----
  console.log('Creating warehouse...');
  const warehouse = await prisma.warehouse.create({
    data: {
      code: 'WH-MAIN',
      name: 'Main Warehouse - NAC Site',
      location: 'New Administrative Capital, Site A',
      status: 'active',
    },
  });

  // ---- Inventory Items (1000) ----
  console.log('Creating 1000 Inventory Items...');
  const materialPrefixes = [
    { cat: 'CEM', names: ['Portland Cement Type I 50kg', 'Portland Cement Type II 50kg', 'White Cement 40kg', 'Sulphate Resistant Cement 50kg', 'Masonry Cement 40kg', 'Quicklime 25kg', 'Hydrated Lime 20kg', 'Plaster of Paris 25kg', 'Calcium Aluminate Cement 50kg', 'Expansive Cement 50kg'] },
    { cat: 'STL', names: ['Steel Rebar 10mm', 'Steel Rebar 12mm', 'Steel Rebar 16mm', 'Steel Rebar 20mm', 'Steel Rebar 25mm', 'Steel Mesh A142', 'Steel Mesh A193', 'Steel Mesh A252', 'Structural Steel H-Beam 200x200', 'Structural Steel I-Beam 150x75'] },
    { cat: 'CER', names: ['Ceramic Floor Tile 40x40cm Beige', 'Ceramic Floor Tile 40x40cm White', 'Ceramic Wall Tile 25x40cm Blue', 'Porcelain Tile 60x60cm Grey', 'Porcelain Tile 60x60cm Cream', 'Mosaic Tile 30x30cm', 'Granite Tile 40x40cm Black', 'Marble Tile 40x40cm White', 'Terrazzo Tile 25x25cm', 'Skirting Tile 10x40cm'] },
    { cat: 'PLM', names: ['PVC Pipe 1/2"', 'PVC Pipe 3/4"', 'PVC Pipe 1"', 'PVC Pipe 2"', 'PVC Pipe 4"', 'PPR Pipe 20mm', 'PPR Pipe 25mm', 'Copper Pipe 15mm', 'Galvanized Pipe 1/2"', 'Flexible Hose 1/2"'] },
    { cat: 'ELE', names: ['PVC Conduit 20mm', 'PVC Conduit 25mm', 'Copper Wire 2.5mm²', 'Copper Wire 4mm²', 'Copper Wire 6mm²', 'Circuit Breaker 16A', 'Circuit Breaker 32A', 'Electrical Panel 12-way', 'LED Bulb 12W', 'Fluorescent Tube 36W'] },
    { cat: 'PNT', names: ['Interior Paint White 5L', 'Interior Paint Cream 5L', 'Exterior Paint White 5L', 'Acrylic Paint Blue 5L', 'Oil Paint Red 1L', 'Varnish Clear 2L', 'Primer White 5L', 'Wall Putty 25kg', 'Paint Roller Set', 'Paint Brush Set 3pc'] },
    { cat: 'AGG', names: ['Fine Sand 1m³', 'Coarse Sand 1m³', 'Crushed Stone 1" 1m³', 'Crushed Stone 3/4" 1m³', 'Gravel 1m³', 'Limestone 1m³', 'Basalt 1m³', 'Dolomite 1m³', 'Slag 1m³', 'Perlite 1m³'] },
    { cat: 'TIM', names: ['Plywood 18mm 1220x2440mm', 'Plywood 12mm 1220x2440mm', 'Timber Pine 50x100mm 3m', 'Timber Pine 100x100mm 3m', 'MDF Board 18mm 1220x2440mm', 'Chipboard 18mm 1220x2440mm', 'OSB Board 18mm 1220x2440mm', 'Hardwood 50x50mm 2.4m', 'Bamboo Panel 10mm', 'Laminated Veneer 3mm'] },
    { cat: 'GLZ', names: ['Single Glass 4mm Clear', 'Double Glass 6mm Clear', 'Tempered Glass 10mm', 'Laminated Glass 6mm', 'Reflective Glass 6mm', 'Frosted Glass 4mm', 'Aluminum Frame White 2m', 'Aluminum Frame Silver 2m', 'Window Hinge Set', 'Glass Door Handle'] },
    { cat: 'HWD', names: ['Steel Nail 2" 1kg', 'Steel Nail 4" 1kg', 'Screw Set 100pc', 'Anchor Bolt 12mm 50pc', 'Door Lock Set', 'Window Latch', 'Hinge Heavy Duty', 'Lever Handle Set', 'Padlock Large', 'Mortise Lock'] },
  ];
  const invItems: any[] = [];
  let itemIdx = 0;
  for (const mp of materialPrefixes) {
    for (let i = 0; i < 100; i++) {
      const idx = i % mp.names.length;
      const name = mp.names[idx];
      const qty = rand(0, 5000);
      const minQty = rand(10, 200);
      const price = randFloat(2, 20000);
      itemIdx++;
      invItems.push({
        code: `${mp.cat}-${String(itemIdx).padStart(4, '0')}`,
        name: i < mp.names.length ? name : `${name} - Variant ${Math.floor(i / mp.names.length) + 1}`,
        description: `Construction material - ${name}`,
        categoryId: pick(categories).id,
        warehouseId: warehouse.id,
        unit: pick(['pc', 'kg', 'm', 'm²', 'm³', 'L', 'bag', 'roll']),
        quantity: qty,
        minQuantity: minQty,
        price: price,
        status: qty === 0 ? 'out_of_stock' : qty < minQty ? 'low_stock' : 'active',
      });
    }
  }
  await prisma.inventoryItem.createMany({ data: invItems });

  // ---- Employees ----
  console.log('Creating 30 Employees...');
  const deptData = [
    { code: 'ADM', name: 'Administration' },
    { code: 'ENG', name: 'Engineering' },
    { code: 'FIN', name: 'Finance' },
    { code: 'SAF', name: 'Safety & Quality' },
    { code: 'LOG', name: 'Logistics' },
  ];
  const departments: any[] = [];
  for (const dd of deptData) {
    const d = await prisma.department.create({ data: dd });
    departments.push(d);
  }

  const employeeData = [
    { code: 'EMP-001', fullName: 'Ahmed Hassan', role: 'Project Manager', salary: 45000, dept: 'ENG' },
    { code: 'EMP-002', fullName: 'Mohamed Ali', role: 'Site Engineer', salary: 25000, dept: 'ENG' },
    { code: 'EMP-003', fullName: 'Sarah Ahmed', role: 'Accountant', salary: 15000, dept: 'FIN' },
    { code: 'EMP-004', fullName: 'Khaled Ibrahim', role: 'Safety Officer', salary: 12000, dept: 'SAF' },
    { code: 'EMP-005', fullName: 'Nadia Mostafa', role: 'HR Manager', salary: 20000, dept: 'ADM' },
    { code: 'EMP-006', fullName: 'Omar Youssef', role: 'Structural Engineer', salary: 28000, dept: 'ENG' },
    { code: 'EMP-007', fullName: 'Laila Mahmoud', role: 'Electrical Engineer', salary: 26000, dept: 'ENG' },
    { code: 'EMP-008', fullName: 'Tamer Fawzy', role: 'Mechanical Engineer', salary: 26000, dept: 'ENG' },
    { code: 'EMP-009', fullName: 'Heba Rashad', role: 'Quantity Surveyor', salary: 22000, dept: 'ENG' },
    { code: 'EMP-010', fullName: 'Yasser Kamal', role: 'Storekeeper', salary: 8000, dept: 'LOG' },
    { code: 'EMP-011', fullName: 'Ayman Said', role: 'Procurement Officer', salary: 18000, dept: 'LOG' },
    { code: 'EMP-012', fullName: 'Mona Galal', role: 'Financial Analyst', salary: 16000, dept: 'FIN' },
    { code: 'EMP-013', fullName: 'Hany Nasr', role: 'Site Supervisor', salary: 15000, dept: 'ENG' },
    { code: 'EMP-014', fullName: 'Dina Shaker', role: 'Architect', salary: 30000, dept: 'ENG' },
    { code: 'EMP-015', fullName: 'Sherif Adel', role: 'Quality Control', salary: 14000, dept: 'SAF' },
    { code: 'EMP-016', fullName: 'Reem Samy', role: 'Office Manager', salary: 10000, dept: 'ADM' },
    { code: 'EMP-017', fullName: 'Waleed Nabil', role: 'Cost Controller', salary: 20000, dept: 'FIN' },
    { code: 'EMP-018', fullName: 'Ghada El Sayed', role: 'Environmental Officer', salary: 11000, dept: 'SAF' },
    { code: 'EMP-019', fullName: 'Hossam Eldin', role: 'Concrete Lab Technician', salary: 9000, dept: 'ENG' },
    { code: 'EMP-020', fullName: 'Marwa Tarek', role: 'Admin Assistant', salary: 7000, dept: 'ADM' },
    { code: 'EMP-021', fullName: 'Islam Ashraf', role: 'Surveyor', salary: 13000, dept: 'ENG' },
    { code: 'EMP-022', fullName: 'Nourhan Fathy', role: 'Payroll Specialist', salary: 12000, dept: 'FIN' },
    { code: 'EMP-023', fullName: 'Abdulrahman Eid', role: 'Heavy Equipment Operator', salary: 10000, dept: 'LOG' },
    { code: 'EMP-024', fullName: 'Salma Fouad', role: 'Public Relations', salary: 9000, dept: 'ADM' },
    { code: 'EMP-025', fullName: 'Mahmoud Zakaria', role: 'Plumbing Supervisor', salary: 14000, dept: 'ENG' },
    { code: 'EMP-026', fullName: 'Eman Arafa', role: 'Document Controller', salary: 8000, dept: 'ADM' },
    { code: 'EMP-027', fullName: 'Bassem Shawky', role: 'Electrical Technician', salary: 8500, dept: 'ENG' },
    { code: 'EMP-028', fullName: 'Rania Adel', role: 'Sustainability Officer', salary: 15000, dept: 'SAF' },
    { code: 'EMP-029', fullName: 'Kareem Hasan', role: 'Logistics Coordinator', salary: 11000, dept: 'LOG' },
    { code: 'EMP-030', fullName: 'Hend Soliman', role: 'Junior Accountant', salary: 7000, dept: 'FIN' },
  ];
  const employees: any[] = [];
  for (const ed of employeeData) {
    const dept = departments.find((d) => d.code === ed.dept);
    const emp = await prisma.employee.create({
      data: {
        code: ed.code,
        fullName: ed.fullName,
        nationalId: String(rand(10000000000000, 99999999999999)),
        phone: `+20 1${rand(0, 1)}${String(rand(10000000, 99999999))}`,
        email: `${ed.fullName.toLowerCase().replace(/\s+/g, '.')}@elwataniya.com`,
        address: `${rand(1, 100)} Street, Cairo`,
        birthDate: new Date(rand(1970, 1998), rand(0, 11), rand(1, 28)),
        hireDate: new Date(2023, rand(0, 11), rand(1, 28)),
        departmentId: dept?.id ?? null,
        salary: ed.salary,
        status: 'active',
        notes: ed.role,
      },
    });
    employees.push(emp);
  }

  // ---- Attendance Records ----
  console.log('Creating 100 Attendance Records...');
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const attendanceStatuses = ['present', 'absent', 'late'];
  const seen = new Set<string>();
  const attItems: any[] = [];
  while (attItems.length < 100) {
    const emp = pick(employees);
    const day = rand(1, daysInMonth);
    const key = `${emp.id}-${day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const attStatus = pick(attendanceStatuses);
    const checkInHour = attStatus === 'late' ? rand(9, 11) : rand(7, 9);
    attItems.push({
      employeeId: emp.id,
      date: new Date(currentYear, currentMonth, day),
      checkIn: `${String(checkInHour).padStart(2, '0')}:${String(rand(0, 59)).padStart(2, '0')}`,
      checkOut: `${String(checkInHour + rand(8, 10)).padStart(2, '0')}:${String(rand(0, 59)).padStart(2, '0')}`,
      status: attStatus,
      hoursWorked: randFloat(6, 10),
      projectId: project.id,
      buildingId: building.id,
      attendanceStatus: attStatus === 'absent' ? 'absent' : attStatus === 'late' ? 'late' : 'checkedOut',
      notes: attStatus === 'absent' ? 'Medical leave' : attStatus === 'late' ? 'Traffic delay' : '',
    });
  }
  await prisma.attendance.createMany({ data: attItems });

  // ---- Summary ----
  const counts = {
    company: await prisma.company.count(),
    project: await prisma.project.count(),
    building: await prisma.building.count(),
    employerBoqItems: await prisma.employerBoqItem.count(),
    analyticalBoqItems: await prisma.analyticalBoqItem.count(),
    finalBoqs: await prisma.finalBoq.count(),
    finalBoqItems: await prisma.finalBoqItem.count(),
    subcontractors: await prisma.subcontractor.count(),
    buildingSubcontractors: await prisma.buildingSubcontractor.count(),
    contractorBoqs: await prisma.contractorBoq.count(),
    contractorBoqItems: await prisma.contractorBoqItem.count(),
    statements: await prisma.statement.count(),
    statementItems: await prisma.statementItem.count(),
    statementDeductions: await prisma.statementDeduction.count(),
    clientStatements: await prisma.clientStatement.count(),
    subcontractorStatements: await prisma.subcontractorStatement.count(),
    purchaseOrders: await prisma.purchase.count(),
    payments: await prisma.payment.count(),
    projectFunds: await prisma.projectFund.count(),
    fundTransactions: await prisma.fundTransaction.count(),
    inventoryItems: await prisma.inventoryItem.count(),
    categories: await prisma.category.count(),
    warehouses: await prisma.warehouse.count(),
    employees: await prisma.employee.count(),
    departments: await prisma.department.count(),
    attendanceRecords: await prisma.attendance.count(),
  };

  console.log('\n========== SEED SUMMARY ==========');
  for (const [key, value] of Object.entries(counts)) {
    console.log(`${key}: ${value}`);
  }
  console.log('==================================\n');
  console.log('Seed completed successfully!');
}

function generateBoqTemplates() {
  const concDescs: string[] = [];
  for (let i = 1; i <= 20; i++) {
    concDescs.push(`Ready Mix Concrete ${250 + i * 10} kg/cm³ for ${['Foundations', 'Columns', 'Slabs', 'Beams', 'Walls'][i % 5]}`);
  }
  const stlDescs: string[] = [];
  const steelSizes = ['8mm', '10mm', '12mm', '14mm', '16mm', '18mm', '20mm', '22mm', '25mm', '32mm'];
  for (let i = 0; i < 10; i++) {
    stlDescs.push(`Steel Reinforcement Bars ${steelSizes[i]} Grade 52`);
    stlDescs.push(`Steel Reinforcement Bars ${steelSizes[i]} Grade 36`);
  }
  const brkDescs = [
    'Red Brick Wall 12cm Thick', 'Red Brick Wall 25cm Thick', 'Cement Block Wall 15cm',
    'Cement Block Wall 20cm', 'Hollow Block Wall 10cm', 'Hollow Block Wall 15cm',
    'Aerated Concrete Block Wall 20cm', 'Gypsum Block Partition 10cm', 'Glass Block Wall',
    'Stone Facing Wall 5cm',
  ];
  const finDescs: string[] = [];
  const finTypes = [
    'Ceramic Floor Tiles', 'Porcelain Floor Tiles', 'Granite Floor Tiles', 'Marble Floor Tiles',
    'Vitrified Tiles', 'Mosaic Tiles', 'Terrazzo Flooring', 'Vinyl Flooring', 'Carpet Flooring',
    'Wooden Parquet',
  ];
  const finWorks = ['40x40cm', '60x60cm', '30x30cm', '25x40cm', '50x50cm'];
  for (const ft of finTypes) {
    for (const fw of finWorks.slice(0, 2)) {
      finDescs.push(`${ft} ${fw} Installation`);
    }
  }
  finDescs.push('Plastering Internal Walls 2cm Thick');
  finDescs.push('Plastering External Walls 2.5cm Thick');
  finDescs.push('Painting with Water-Based Paint 2 Coats');
  finDescs.push('Painting with Oil-Based Paint 2 Coats');
  finDescs.push('Textured Paint Finish');
  finDescs.push('Gypsum Board Ceiling Suspended');
  finDescs.push('False Ceiling with PVC Panels');
  finDescs.push('Wallpaper Installation');

  const eleDescs = [
    'PVC Conduit 20mm Diameter', 'PVC Conduit 25mm Diameter', 'PVC Conduit 32mm Diameter',
    'Copper Wire 2.5mm² PVC Insulated', 'Copper Wire 4mm² PVC Insulated',
    'Copper Wire 6mm² PVC Insulated', 'Copper Wire 10mm² PVC Insulated',
    'Copper Wire 16mm² PVC Insulated', 'Single Pole Circuit Breaker 16A',
    'Single Pole Circuit Breaker 32A', 'Three Pole Circuit Breaker 63A',
    'Three Pole Circuit Breaker 100A', 'Distribution Board 12-Way Metal',
    'Distribution Board 24-Way Metal', 'LED Panel Light 600x600mm 48W',
    'LED Downlight 12W', 'Emergency Exit Light', 'Smoke Detector',
    'Fire Alarm Manual Call Point', 'Data Outlet RJ45 Cat6',
  ];
  const plmDescs = [
    'PVC Pipe 1/2" Diameter Class 6', 'PVC Pipe 3/4" Diameter Class 6',
    'PVC Pipe 1" Diameter Class 10', 'PVC Pipe 2" Diameter Class 10',
    'PVC Pipe 4" Diameter Class 6', 'PPR Pipe 20mm Hot & Cold',
    'PPR Pipe 25mm Hot & Cold', 'PPR Pipe 32mm Hot & Cold',
    'Copper Pipe 15mm Type L', 'Copper Pipe 22mm Type L',
    'Galvanized Steel Pipe 1/2"', 'Galvanized Steel Pipe 1"',
    'Water Tank 500L Polyethylene', 'Water Tank 1000L Polyethylene',
    'Water Heater 50L Electric', 'Water Heater 80L Electric',
    'Bathroom Fixtures Set Complete', 'Kitchen Sink Stainless Steel',
    'Faucet Chrome Single Lever', 'Shower Set Complete with Mixer',
  ];
  const sitDescs = [
    'Earth Excavation for Foundations', 'Earth Excavation for Basement',
    'Soil Backfilling & Compaction', 'Site Grading & Leveling',
    'Road Base Course 20cm Thick', 'Road Asphalt Layer 5cm Thick',
    'Concrete Paving for Walkways', 'Interlocking Paver Installation',
    'Landscaping & Topsoil Spreading', 'Tree Planting with Irrigation',
    'Sod Installation 5cm Thick', 'Fence Installation 2m High',
    'Retaining Wall Concrete', 'Storm Water Drainage System',
    'Sewer Line PVC 6"', 'Water Supply Line HDPE 2"',
    'Parking Lot Striping', 'Outdoor Lighting Pole Installation',
    'Bollard Installation Street', 'Concrete Curb Installation',
  ];

  return [
    { codePrefix: 'CONC', unit: 'm³', qtyMin: 50, qtyMax: 5000, priceMin: 800, priceMax: 2500, descriptions: concDescs },
    { codePrefix: 'STL', unit: 'ton', qtyMin: 10, qtyMax: 500, priceMin: 12000, priceMax: 35000, descriptions: stlDescs },
    { codePrefix: 'BRK', unit: 'm²', qtyMin: 100, qtyMax: 5000, priceMin: 150, priceMax: 800, descriptions: brkDescs },
    { codePrefix: 'FIN', unit: 'm²', qtyMin: 50, qtyMax: 10000, priceMin: 30, priceMax: 500, descriptions: finDescs },
    { codePrefix: 'ELE', unit: 'unit', qtyMin: 10, qtyMax: 500, priceMin: 200, priceMax: 5000, descriptions: eleDescs },
    { codePrefix: 'PLM', unit: 'unit', qtyMin: 10, qtyMax: 1000, priceMin: 100, priceMax: 3000, descriptions: plmDescs },
    { codePrefix: 'SIT', unit: 'm³', qtyMin: 100, qtyMax: 50000, priceMin: 25, priceMax: 200, descriptions: sitDescs },
  ];
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
