// lib/mockData.ts

// ============================================
// بيانات المشاريع
// ============================================
export const mockProjects = [
  {
    id: "1",
    name: "مشروع الأندلس السكني",
    location: "مدينة نصر، القاهرة",
    description: "مجمع سكني متكامل يضم 5 عمارات سكنية",
    client: "شركة الأندلس للتطوير العقاري",
    startDate: "2024-01-01",
    status: "active",
    progress: 75,
  },
  {
    id: "2",
    name: "برج النيل التجاري",
    location: "الشيخ زايد، الجيزة",
    description: "برج إداري وتجاري بارتفاع 15 دور",
    client: "الهيئة الهندسية",
    startDate: "2023-06-01",
    status: "completed",
    progress: 100,
  },
  {
    id: "3",
    name: "منتجع البحر الذهبي",
    location: "الساحل الشمالي",
    description: "منتجع سياحي فاخر على البحر مباشرة",
    client: "شركة البحر الذهبي للسياحة",
    startDate: "2024-03-01",
    status: "active",
    progress: 45,
  },
];

// ============================================
// المباني (مرتبطة بالمشاريع)
// ============================================
export const mockBuildings = [
  {
    id: "1",
    name: "العمارة A",
    code: "B001",
    projectId: "1",
    type: "سكني",
    startDate: "2024-01-15",
    description: "عمارة سكنية مكونة من 8 أدوار",
    status: "active",
  },
  {
    id: "2",
    name: "العمارة B",
    code: "B002",
    projectId: "1",
    type: "سكني",
    startDate: "2024-02-01",
    description: "عمارة سكنية مكونة من 6 أدوار",
    status: "active",
  },
  {
    id: "3",
    name: "المبنى الإداري",
    code: "B003",
    projectId: "2",
    type: "إداري",
    startDate: "2023-06-15",
    description: "مبنى إداري من 5 أدوار",
    status: "completed",
  },
];

// ============================================
// مستخلصات المقاولين للمباني (Building Subcontractor Statements)
// ============================================
export const mockBuildingSubcontractorStatements = [
  {
    id: "1",
    buildingId: "1",
    subcontractorId: "1",
    statementNumber: "B-T-B-9",
    date: "2024-06-01",
    status: "approved",
    netAmount: 4112557,
    items: [
      { itemName: "أعمال حفر", quantity: 300, unitPrice: 120, total: 36000 },
    ],
    deductions: [{ name: "تأمين", amount: 1800 }],
  },
  {
    id: "2",
    buildingId: "1",
    subcontractorId: "2",
    statementNumber: "B-T-A-26",
    date: "2024-06-15",
    status: "pending",
    netAmount: 493948.75,
    items: [
      { itemName: "أعمال حدادة", quantity: 200, unitPrice: 180, total: 36000 },
    ],
    deductions: [{ name: "تأمين", amount: 1800 }],
  },
];

// ============================================
// الموظفين مع الصلاحيات
// ============================================
export const mockEmployees = [
  {
    id: "1",
    name: "أحمد علي",
    role: "مدير الشركة",
    roleKey: "ceo",
    email: "ahmed@elwataniya.com",
    phone: "01009890386",
    project: "جميع المشاريع",
    hireDate: "2020-01-15",
    salary: 15000,
  },
  {
    id: "2",
    name: "محمود حسن",
    role: "مدير المكتب الفني",
    roleKey: "technical_office",
    email: "mahmoud@elwataniya.com",
    phone: "01015313070",
    project: "جميع المشاريع",
    hireDate: "2021-03-10",
    salary: 12000,
  },
  {
    id: "3",
    name: "كريم سعيد",
    role: "مهندس موقع",
    roleKey: "site_engineer",
    email: "karim@elwataniya.com",
    phone: "01000068629",
    project: "مشروع الأندلس",
    hireDate: "2022-01-20",
    salary: 8000,
  },
  {
    id: "4",
    name: "محمد إبراهيم",
    role: "محاسب",
    roleKey: "accountant",
    email: "mohamed@elwataniya.com",
    phone: "01015313071",
    project: "جميع المشاريع",
    hireDate: "2021-06-01",
    salary: 9000,
  },
  {
    id: "5",
    name: "سيد أحمد",
    role: "مدير مخازن",
    roleKey: "store_manager",
    email: "sayyed@elwataniya.com",
    phone: "01015313072",
    project: "مشروع الأندلس",
    hireDate: "2022-08-15",
    salary: 7000,
  },
];

// ============================================
// العملاء (جهات الإسناد)
// ============================================
export const mockClients = [
  {
    id: "1",
    name: "شركة الأندلس للتطوير العقاري",
    email: "info@alandalus.com",
    phone: "0223456789",
    address: "مدينة نصر، القاهرة",
    contactPerson: "أحمد محمود",
    projects: ["مشروع الأندلس السكني"],
    joinDate: "2024-01-01",
    status: "active",
  },
  {
    id: "2",
    name: "الهيئة الهندسية",
    email: "info@eng.gov.eg",
    phone: "0223456790",
    address: "القاهرة الجديدة",
    contactPerson: "لواء مهندس محمد سعيد",
    projects: ["برج النيل التجاري"],
    joinDate: "2023-06-01",
    status: "active",
  },
  {
    id: "3",
    name: "شركة البحر الذهبي للسياحة",
    email: "info@gb-resort.com",
    phone: "0223456791",
    address: "الساحل الشمالي، مطروح",
    contactPerson: "يوسف عادل",
    projects: ["منتجع البحر الذهبي"],
    joinDate: "2024-03-01",
    status: "active",
  },
  {
    id: "4",
    name: "الشركة العربية للمقاولات",
    email: "info@arabco.com",
    phone: "0223456792",
    address: "الشيخ زايد، الجيزة",
    contactPerson: "طارق حسين",
    projects: [],
    joinDate: "2024-05-01",
    status: "inactive",
  },
];

// ============================================
// الموردين
// ============================================
export const mockSuppliers = [
  {
    id: "1",
    name: "شركة السويس للأسمنت",
    contactPerson: "أحمد محمود",
    phone: "0223456789",
    email: "info@suezcement.com",
    address: "السويس، مصر",
    products: ["أسمنت بورتلاند", "أسمنت مقاوم"],
    paymentTerms: "30 يوم",
    joinDate: "2024-01-01",
    status: "active",
  },
  {
    id: "2",
    name: "حديد المصريين",
    contactPerson: "محمد إبراهيم",
    phone: "0223456790",
    email: "info@egyiron.com",
    address: "العاشر من رمضان",
    products: ["حديد تسليح 6mm", "حديد تسليح 8mm", "حديد تسليح 10mm"],
    paymentTerms: "45 يوم",
    joinDate: "2024-01-15",
    status: "active",
  },
  {
    id: "3",
    name: "طوب النيل",
    contactPerson: "سعيد حسن",
    phone: "0223456791",
    email: "info@nilebrick.com",
    address: "المنيا، مصر",
    products: ["طوب أحمر", "طوب أسمنتي"],
    paymentTerms: "نقدي",
    joinDate: "2024-02-01",
    status: "inactive",
  },
  {
    id: "4",
    name: "الشرق للأخشاب",
    contactPerson: "خالد سيد",
    phone: "0223456792",
    email: "info@sharqwood.com",
    address: "الإسكندرية",
    products: ["خشب موسكي", "أبلاكاش", "قوالب خشب"],
    paymentTerms: "شيك مؤجل 60 يوم",
    joinDate: "2024-03-01",
    status: "active",
  },
];

// ============================================
// المستخدمين
// ============================================
export const mockUsers = [
  { id: "1", name: "أحمد علي", role: "ceo", email: "ahmed@elwataniya.com" },
  {
    id: "2",
    name: "محمود حسن",
    role: "technical_office",
    email: "mahmoud@elwataniya.com",
  },
  {
    id: "3",
    name: "كريم سعيد",
    role: "site_engineer",
    email: "karim@elwataniya.com",
  },
  {
    id: "4",
    name: "محمد إبراهيم",
    role: "accountant",
    email: "mohamed@elwataniya.com",
  },
  {
    id: "5",
    name: "سيد أحمد",
    role: "store_manager",
    email: "sayyed@elwataniya.com",
  },
];

// ============================================
// الإشعارات
// ============================================
export const mockNotifications = [
  {
    id: "1",
    title: "مقايسة جديدة",
    titleEn: "New Estimate",
    message: "تم إضافة مقايسة تحليلية جديدة لمشروع الأندلس",
    messageEn: "New analytical estimate added for Al-Andalus project",
    type: "info",
    date: new Date().toISOString(),
    read: false,
  },
  {
    id: "2",
    title: "مستخلص قيد الانتظار",
    titleEn: "Pending Statement",
    message: "مستخلص المقاول محمد أبو كريم ينتظر الموافقة",
    messageEn: "Subcontractor Mohamed Abu Kareem statement pending approval",
    type: "warning",
    date: new Date(Date.now() - 86400000).toISOString(),
    read: false,
  },
  {
    id: "3",
    title: "مخزون منخفض",
    titleEn: "Low Stock",
    message: "الأسمنت المتبقي 50 كيس فقط - أقل من الحد الأدنى",
    messageEn: "Only 50 cement bags remaining - below minimum level",
    type: "error",
    date: new Date(Date.now() - 172800000).toISOString(),
    read: false,
  },
];

// ============================================
// المقاولين الباطنين
// ============================================
export const mockSubcontractors = [
  {
    id: "1",
    name: "محمد أبو كريم",
    workType: "حداد",
    marginType: "percentage",
    marginValue: 15,
    phone: "01009890386",
    email: "mohamed@example.com",
    address: "مدينة نصر، القاهرة",
    joinDate: "2024-01-15",
    status: "active",
    projects: ["مشروع الأندلس السكني"],
  },
  {
    id: "2",
    name: "علي حسن",
    workType: "نجار",
    marginType: "percentage",
    marginValue: 12,
    phone: "01015313070",
    email: "ali@example.com",
    address: "الشيخ زايد، الجيزة",
    joinDate: "2024-02-01",
    status: "active",
    projects: ["مشروع الأندلس السكني", "برج النيل التجاري"],
  },
  {
    id: "3",
    name: "سيد إبراهيم",
    workType: "سباك",
    marginType: "fixed",
    marginValue: 5000,
    phone: "01000068629",
    email: "sayyed@example.com",
    address: "الساحل الشمالي",
    joinDate: "2024-03-10",
    status: "active",
    projects: ["منتجع البحر الذهبي"],
  },
  {
    id: "4",
    name: "محمود عبد الله",
    workType: "كهرباء",
    marginType: "percentage",
    marginValue: 18,
    phone: "01012345678",
    email: "mahmoud@example.com",
    address: "التجمع الخامس، القاهرة",
    joinDate: "2024-01-20",
    status: "inactive",
    projects: ["برج النيل التجاري"],
  },
];

// ============================================
// الخزنة (على مستوى المشروع)
// ============================================
export const mockProjectTreasury = [
  {
    projectId: "1",
    initialBalance: 2000000,
    transactions: [
      {
        id: "1",
        type: "مستخلص مقاول",
        date: "2024-06-01",
        amount: -36000,
        description: "مستخلص مقاول حفر",
      },
      {
        id: "2",
        type: "مستخلص مقاول",
        date: "2024-06-08",
        amount: -24000,
        description: "مستخلص مقاول حفر",
      },
      {
        id: "3",
        type: "مشتريات",
        date: "2024-06-05",
        amount: -50000,
        description: "شراء أسمنت",
      },
      {
        id: "4",
        type: "رواتب",
        date: "2024-06-01",
        amount: -30000,
        description: "رواتب موظفي المشروع",
      },
    ],
  },
];

// ============================================
// العهدة (Project Funds) - النسخة النهائية الموحدة
// ============================================
export interface Transaction {
  id: string;
  type: "add" | "deduct" | "request";
  category: "purchase" | "miscellaneous" | "general";
  amount: number;
  description: string;
  date: string;
  status?: "pending" | "approved" | "rejected";
  referenceId?: string;
  invoiceFile?: {
    name: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: string;
  };
}

export interface ProjectFund {
  id: string;
  projectId: string;
  initialBalance: number;
  currentBalance: number;
  lastUpdated: string;
  transactions: Transaction[];
}

// ✅ بيانات وهمية للعهدة الموحدة
export const mockProjectFunds: ProjectFund[] = [
  {
    id: "pf-1",
    projectId: "1",
    initialBalance: 550000,
    currentBalance: 490000,
    lastUpdated: "2024-06-24",
    transactions: [
      {
        id: "pft-1",
        type: "add",
        category: "general",
        amount: 550000,
        description: "عهدة المشروع الابتدائية",
        date: "2024-06-01",
      },
      {
        id: "pft-2",
        type: "deduct",
        category: "purchase",
        amount: 50000,
        description: "شراء أسمنت",
        date: "2024-06-05",
        referenceId: "p-1",
      },
      {
        id: "pft-3",
        type: "deduct",
        category: "miscellaneous",
        amount: 2500,
        description: "وجبات عمال",
        date: "2024-06-07",
        referenceId: "m-1",
      },
      {
        id: "pft-4",
        type: "deduct",
        category: "purchase",
        amount: 40000,
        description: "شراء حديد",
        date: "2024-06-10",
        referenceId: "p-2",
      },
      {
        id: "pft-5",
        type: "deduct",
        category: "miscellaneous",
        amount: 1500,
        description: "تمويل عربية",
        date: "2024-06-12",
        referenceId: "m-2",
      },
      {
        id: "pft-6",
        type: "request",
        category: "general",
        amount: 100000,
        description: "طلب زيادة عهدة",
        date: "2024-06-15",
        status: "pending",
      },
    ],
  },
];

// ============================================
// المقايسات (مرتبطة بالمباني)
// ============================================
export const mockEstimates = [
  {
    id: "1",
    buildingId: "1",
    type: "client",
    name: "مقايسة جهة الإسناد - العمارة A",
    number: "EST-001",
    date: "2024-01-10",
    totalAmount: 5000000,
    status: "approved",
    items: [
      {
        id: "1",
        name: "أعمال حفر",
        quantity: 1000,
        unit: "م³",
        unitPrice: 150,
        total: 150000,
      },
      {
        id: "2",
        name: "أعمال حدادة",
        quantity: 500,
        unit: "م³",
        unitPrice: 200,
        total: 100000,
      },
    ],
  },
  {
    id: "2",
    buildingId: "1",
    type: "company",
    name: "المقايسة التحليلية - العمارة A",
    number: "EST-002",
    date: "2024-01-12",
    totalAmount: 3500000,
    status: "approved",
    items: [
      {
        id: "1",
        name: "أعمال حفر",
        quantity: 1000,
        unit: "م³",
        unitPrice: 120,
        executedQuantity: 300,
        remainingQuantity: 700,
      },
      {
        id: "2",
        name: "أعمال حدادة",
        quantity: 500,
        unit: "م³",
        unitPrice: 180,
        executedQuantity: 200,
        remainingQuantity: 300,
      },
    ],
  },
];

// ============================================
// ربط المقاولين بالمباني
// ============================================
export const mockBuildingSubcontractors = [
  {
    id: "1",
    buildingId: "1",
    subcontractorId: "1",
    assignedDate: "2024-01-15",
    status: "active",
    workType: "حداد",
    agreedPrice: 120,
  },
  {
    id: "2",
    buildingId: "1",
    subcontractorId: "2",
    assignedDate: "2024-01-20",
    status: "active",
    workType: "نجار",
    agreedPrice: 180,
  },
];

// ============================================
// نثريات المشروع
// ============================================
export interface ProjectMiscellaneous {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  category: "food" | "transport" | "tools" | "other";
  date: string;
  notes?: string;
  createdBy: string;
}

export const mockMiscellaneous: ProjectMiscellaneous[] = [
  {
    id: "1",
    projectId: "1",
    description: "وجبات عمال",
    amount: 2500,
    category: "food",
    date: "2024-06-01",
    notes: "وجبات 15 عامل",
    createdBy: "مدير الموقع",
  },
  {
    id: "2",
    projectId: "1",
    description: "تمويل عربية نقل مواد",
    amount: 1500,
    category: "transport",
    date: "2024-06-03",
    notes: "نقل حديد من المخزن للموقع",
    createdBy: "مدير الموقع",
  },
  {
    id: "3",
    projectId: "1",
    description: "عدد يدوية",
    amount: 800,
    category: "tools",
    date: "2024-06-05",
    notes: "مفكات، شاكوش، متر",
    createdBy: "مدير الموقع",
  },
];

// ============================================
// مستخلصات جهة الإسناد (Client Statements)
// ============================================
export const mockClientStatements = [
  {
    id: "1",
    statementNumber: "CS-001",
    projectId: "1",
    projectName: "مشروع الأندلس السكني",
    buildingId: "1",
    buildingName: "العمارة A",
    clientId: "1",
    clientName: "شركة الأندلس للتطوير العقاري",
    date: "2024-06-01",
    status: "pending",
    totalWorkValue: 3703790,
    totalDeductions: 3227937,
    netPayable: 475853,
    items: [
      {
        id: "1",
        itemName: "فرق تخشيب",
        unit: "م³",
        quantity: 1000,
        unitPrice: 150,
        total: 150000,
        previous: 0,
        current: 1000,
        totalDone: 1000,
        final: 100,
        workValue: 150000,
        deduction: 7500,
        net: 142500,
        notes: "",
      },
      {
        id: "2",
        itemName: "لبشة عادية",
        unit: "م³",
        quantity: 800,
        unitPrice: 200,
        total: 160000,
        previous: 0,
        current: 800,
        totalDone: 800,
        final: 100,
        workValue: 160000,
        deduction: 8000,
        net: 152000,
        notes: "",
      },
      {
        id: "3",
        itemName: "خرسانة مسلحة لزوم الأساسات",
        unit: "م³",
        quantity: 1332,
        unitPrice: 430,
        total: 572760,
        previous: 1310,
        current: 22,
        totalDone: 1332,
        final: 100,
        workValue: 572760,
        deduction: 28638,
        net: 544122,
        notes: "",
      },
      {
        id: "4",
        itemName: "خرسانة مسلحة لزوم حوائط البدروم",
        unit: "م³",
        quantity: 208,
        unitPrice: 880,
        total: 183040,
        previous: 211,
        current: -3,
        totalDone: 208,
        final: 100,
        workValue: 183040,
        deduction: 9152,
        net: 173888,
        notes: "",
      },
      {
        id: "5",
        itemName: "خرسانة مسلحة لزوم أعمدة البدروم",
        unit: "م³",
        quantity: 87,
        unitPrice: 880,
        total: 76560,
        previous: 87,
        current: 0,
        totalDone: 87,
        final: 100,
        workValue: 76560,
        deduction: 3828,
        net: 72732,
        notes: "",
      },
    ],
    deductions: [
      {
        id: "1",
        name: "خصومات من اللبشة تصرف دفعات مع باقى الأدوار",
        amount: 29210.5,
      },
      { id: "2", name: "تأمين أعمال المقاول الباطن", amount: 181226.5 },
      { id: "3", name: "خصم 5 يومية لأبو كريم", amount: 2500 },
      { id: "4", name: "خصم سوء مصنعية بأعمدة الدور الأرضي", amount: 5000 },
    ],
    signatures: [
      { id: "1", name: "أحمد علي", title: "مدير المشروع", date: "2024-06-01" },
      { id: "2", name: "محمد إبراهيم", title: "محاسب", date: "2024-06-01" },
    ],
  },
];

// ============================================
// مستخلصات المقاولين
// ============================================
export const mockSubcontractorStatements = [
  {
    id: "1",
    statementNumber: "B-T-B-9",
    projectId: "1",
    projectName: "مشروع الأندلس السكني",
    buildingId: "1",
    buildingName: "العمارة A",
    subcontractorId: "1",
    subcontractorName: "محمد أبو كريم",
    workType: "حداد مسلح",
    date: "2024-06-01",
    status: "approved",
    blockNumber: "B-T-B-9",
    formNumber: "B-T-B-9",
    insurancePercent: 5,
    totalWorkValue: 4324060,
    totalInsurance: 216203,
    totalDeductions: 12000,
    previousPaid: 4055000,
    netPayable: 4112557,
    runningNumber: 1,
    items: [
      {
        id: "1",
        itemName: "فرق تخشيب",
        unit: "مقطوعية",
        previous: 1,
        current: 1,
        executionPercent: 100,
        count: 1,
        quantity: 1,
        price: 30000,
        totalAmount: 30000,
        insuranceAmount: 1500,
        netAmount: 28500,
      },
      {
        id: "2",
        itemName: "لبشة عادية",
        unit: "مقطوعية",
        previous: 1,
        current: 1,
        executionPercent: 40,
        count: 1,
        quantity: 1,
        price: 29760,
        totalAmount: 29760,
        insuranceAmount: 1488,
        netAmount: 28272,
      },
    ],
    deductions: [
      {
        id: "1",
        name: "خصومات من اللبشة تصرف دفعات مع باقى الأدوار",
        amount: 29210.5,
        percent: 5,
      },
      {
        id: "2",
        name: "تأمين أعمال المقاول الباطن",
        amount: 181226.5,
        percent: 5,
      },
    ],
    signatures: [
      {
        id: "1",
        name: "محمود حسن",
        title: "مدير المكتب الفني",
        date: "2024-06-01",
      },
    ],
  },
];

// ============================================
// مقايسات جهة الإسناد
// ============================================
export const mockClientEstimates = [
  {
    id: "c1",
    buildingId: "1",
    name: "مقايسة أعمال الهيكل الخرساني",
    number: "EST-C-001",
    clientName: "الهيئة الهندسية للقوات المسلحة",
    contractNumber: "CON-2024-001",
    totalValue: 5000000,
    date: "2024-01-10",
    status: "approved",
    items: [
      {
        id: "1",
        name: "أعمال حفر",
        quantity: 1000,
        unit: "م³",
        unitPrice: 150,
        total: 150000,
      },
      {
        id: "2",
        name: "أعمال حدادة",
        quantity: 500,
        unit: "م³",
        unitPrice: 200,
        total: 100000,
      },
      {
        id: "3",
        name: "أعمال خرسانة",
        quantity: 800,
        unit: "م³",
        unitPrice: 300,
        total: 240000,
      },
    ],
  },
  {
    id: "c2",
    buildingId: "1",
    name: "مقايسة أعمال التشطيبات",
    number: "EST-C-002",
    clientName: "الهيئة الهندسية للقوات المسلحة",
    contractNumber: "CON-2024-002",
    totalValue: 3000000,
    date: "2024-02-15",
    status: "pending",
    items: [
      {
        id: "1",
        name: "بياض داخلي",
        quantity: 2000,
        unit: "م²",
        unitPrice: 50,
        total: 100000,
      },
      {
        id: "2",
        name: "دهانات",
        quantity: 2000,
        unit: "م²",
        unitPrice: 30,
        total: 60000,
      },
    ],
  },
];

// ============================================
// المقايسات التحليلية (الشركة)
// ============================================
export const mockCompanyEstimates = [
  {
    id: "co1",
    buildingId: "1",
    name: "تحليل أعمال الهيكل الخرساني",
    number: "EST-CO-001",
    clientName: "الهيئة الهندسية للقوات المسلحة",
    contractNumber: "CON-2024-001",
    totalValue: 4200000,
    date: "2024-01-20",
    status: "approved",
    items: [
      {
        id: "1",
        name: "أعمال حفر",
        quantity: 1000,
        unit: "م³",
        unitPrice: 120,
        total: 120000,
      },
      {
        id: "2",
        name: "أعمال حدادة",
        quantity: 500,
        unit: "م³",
        unitPrice: 180,
        total: 90000,
      },
    ],
  },
  {
    id: "co2",
    buildingId: "1",
    name: "تحليل أعمال التشطيبات",
    number: "EST-CO-002",
    clientName: "الهيئة الهندسية للقوات المسلحة",
    contractNumber: "CON-2024-002",
    totalValue: 2500000,
    date: "2024-02-25",
    status: "pending",
    items: [
      {
        id: "1",
        name: "بياض داخلي",
        quantity: 2000,
        unit: "م²",
        unitPrice: 40,
        total: 80000,
      },
    ],
  },
];

// ============================================
// بيانات المخازن
// ============================================
export const mockInventory = [
  {
    id: "1",
    name: "أسمنت بورتلاند",
    unit: "كيس",
    quantity: 500,
    minQuantity: 100,
  },
  {
    id: "2",
    name: "حديد تسليح 6mm",
    unit: "لفة",
    quantity: 200,
    minQuantity: 50,
  },
  {
    id: "3",
    name: "طوب أحمر",
    unit: "ألف طوبة",
    quantity: 150,
    minQuantity: 30,
  },
];

// ============================================
// المخازن - Store (تخزين مؤقت)
// ============================================
export interface InventoryStoreItem {
  id: string;
  code: string;
  name: string;
  category: string;
  quantity: number; // الباقي (المتبقي في المخزن)
  unit: string;
  price: number;
  location: string;
  minQuantity: number;
  previousBalance: number; // السابق
  incoming: number; // الوارد
  outgoing: number; // المنصرف
  total: number; // الإجمالي
  transactions: {
    id: string;
    type: "in" | "out";
    quantity: number;
    date: string;
    source?: string;
    notes?: string;
  }[];
}

// ✅ Store للمخازن
let inventoryStore: InventoryStoreItem[] = [];

// ✅ تحميل البيانات من localStorage
const loadInventoryFromStorage = (): InventoryStoreItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("elwataniya_inventory");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return [];
};

// ✅ حفظ البيانات في localStorage
export const saveInventoryToStorage = (data: InventoryStoreItem[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("elwataniya_inventory", JSON.stringify(data));
  } catch {
    // ignore
  }
};

// ✅ تهيئة الـ Store من localStorage
inventoryStore = loadInventoryFromStorage();

// ✅ دوال إدارة المخازن
export function getInventoryItems(projectId?: string): InventoryStoreItem[] {
  // لو مفيش بيانات، استخدم الـ mock data
  if (inventoryStore.length === 0 && typeof window !== "undefined") {
    inventoryStore = mockInventory.map((item) => ({
      id: item.id,
      code: item.name.substring(0, 4).toUpperCase(),
      name: item.name,
      category: "مواد بناء",
      quantity: item.quantity,
      unit: item.unit,
      price: 0,
      location: "مخزن رئيسي",
      minQuantity: item.minQuantity || 10,
      previousBalance: item.quantity,
      incoming: 0,
      outgoing: 0,
      total: item.quantity,
      transactions: [],
    }));
    saveInventoryToStorage(inventoryStore);
  }
  return inventoryStore;
}

export function addInventoryItem(
  item: Omit<InventoryStoreItem, "id" | "transactions">
): InventoryStoreItem {
  const newItem: InventoryStoreItem = {
    ...item,
    id: `inv-${Date.now()}`,
    transactions: [],
  };
  inventoryStore = [newItem, ...inventoryStore];
  saveInventoryToStorage(inventoryStore);
  return newItem;
}

export function updateInventoryItem(
  id: string,
  data: Partial<InventoryStoreItem>
): InventoryStoreItem | null {
  const index = inventoryStore.findIndex((item) => item.id === id);
  if (index === -1) return null;
  inventoryStore[index] = { ...inventoryStore[index], ...data };
  saveInventoryToStorage(inventoryStore);
  return inventoryStore[index];
}

export function deleteInventoryItem(id: string): boolean {
  const index = inventoryStore.findIndex((item) => item.id === id);
  if (index === -1) return false;
  inventoryStore.splice(index, 1);
  saveInventoryToStorage(inventoryStore);
  return true;
}

// ============================================
// لوحات المشروع (Project Boards)
// ============================================
export const mockProjectBoards = [
  {
    id: "1",
    buildingId: "1",
    name: "لوحة الأعمال الخرسانية",
    description: "تفاصيل صب الخرسانة للدور الأرضي والأول",
    image:
      "https://images.pexels.com/photos/2760242/pexels-photo-2760242.jpeg?w=300&h=200&fit=crop",
    date: "2024-01-15",
    createdBy: "أحمد علي",
  },
  {
    id: "2",
    buildingId: "1",
    name: "لوحة أعمال الكهرباء",
    description: "مخططات توزيع الكهرباء لجميع الأدوار",
    image:
      "https://images.pexels.com/photos/210182/pexels-photo-210182.jpeg?w=300&h=200&fit=crop",
    date: "2024-02-20",
    createdBy: "محمود حسن",
  },
];

// ============================================
// بيانات الحضور
// ============================================
export const mockAttendance = [
  {
    id: "1",
    employeeId: "1",
    employeeName: "أحمد علي",
    date: "2024-06-10",
    checkIn: "08:30",
    checkOut: "16:30",
    status: "present",
    hoursWorked: 8,
    notes: "",
  },
  {
    id: "2",
    employeeId: "2",
    employeeName: "محمود حسن",
    date: "2024-06-10",
    checkIn: "09:00",
    checkOut: "17:00",
    status: "present",
    hoursWorked: 8,
    notes: "",
  },
  {
    id: "3",
    employeeId: "3",
    employeeName: "كريم سعيد",
    date: "2024-06-10",
    checkIn: "",
    checkOut: "",
    status: "absent",
    hoursWorked: 0,
    notes: "إجازة مرضية",
  },
  {
    id: "4",
    employeeId: "4",
    employeeName: "محمد إبراهيم",
    date: "2024-06-10",
    checkIn: "08:45",
    checkOut: "16:15",
    status: "present",
    hoursWorked: 7.5,
    notes: "",
  },
  {
    id: "5",
    employeeId: "5",
    employeeName: "سيد أحمد",
    date: "2024-06-10",
    checkIn: "10:00",
    checkOut: "16:00",
    status: "late",
    hoursWorked: 6,
    notes: "تأخير ساعة",
  },
];

// ============================================
// دالة الصلاحيات
// ============================================
export const getEmployeePermissions = (roleKey: string, projectId?: string) => {
  switch (roleKey) {
    case "ceo":
      return {
        allProjects: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
      };
    case "technical_office":
      return {
        allProjects: true,
        canEdit: true,
        canDelete: false,
        canApprove: false,
      };
    case "site_engineer":
      return {
        allProjects: false,
        projectId,
        canEdit: true,
        canDelete: false,
        canApprove: false,
      };
    case "accountant":
      return {
        allProjects: true,
        canEdit: false,
        canDelete: false,
        canApprove: true,
        financialOnly: true,
      };
    case "store_manager":
      return {
        allProjects: false,
        projectId,
        canEdit: false,
        canDelete: false,
        inventoryOnly: true,
      };
    default:
      return { allProjects: false, canEdit: false, canDelete: false };
  }
};

// ============================================
// دوال مساعدة للـ Attendance
// ============================================
export const getAttendanceByDate = (date: string) => {
  return mockAttendance.filter((a) => a.date === date);
};

export const getAttendanceByEmployee = (employeeId: string) => {
  return mockAttendance.filter((a) => a.employeeId === employeeId);
};

// ============================================
// المشتريات - Store (تخزين مؤقت)
// ============================================
export interface PurchaseStoreItem {
  id: string;
  projectId: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  date: string;
  supplier?: string;
  notes?: string;
  addedToInventory: boolean;
  inventoryItemId?: string;
  invoiceFile?: {
    name: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: string;
  };
}

// ✅ Store للمشتريات (يحتفظ بالبيانات بين الـ refreshes)
let purchasesStore: PurchaseStoreItem[] = [];

// ✅ تحميل البيانات من localStorage (لو موجودة)
const loadPurchasesFromStorage = (): PurchaseStoreItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("elwataniya_purchases");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return [];
};

// ✅ حفظ البيانات في localStorage
const savePurchasesToStorage = (data: PurchaseStoreItem[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("elwataniya_purchases", JSON.stringify(data));
  } catch {
    // ignore
  }
};

// ✅ تهيئة الـ Store من localStorage
purchasesStore = loadPurchasesFromStorage();

// ✅ دوال إدارة المشتريات
export function getPurchases(projectId: string): PurchaseStoreItem[] {
  return purchasesStore.filter((p) => p.projectId === projectId);
}

export function addPurchase(
  projectId: string,
  purchase: Omit<PurchaseStoreItem, "id" | "projectId">
): PurchaseStoreItem {
  const newPurchase: PurchaseStoreItem = {
    ...purchase,
    id: Date.now().toString(),
    projectId,
  };
  purchasesStore = [newPurchase, ...purchasesStore];
  savePurchasesToStorage(purchasesStore);
  return newPurchase;
}

export function updatePurchase(
  projectId: string,
  id: string,
  data: Partial<PurchaseStoreItem>
): PurchaseStoreItem | null {
  const index = purchasesStore.findIndex(
    (p) => p.id === id && p.projectId === projectId
  );
  if (index === -1) return null;
  purchasesStore[index] = { ...purchasesStore[index], ...data };
  savePurchasesToStorage(purchasesStore);
  return purchasesStore[index];
}

export function deletePurchase(projectId: string, id: string): boolean {
  const index = purchasesStore.findIndex(
    (p) => p.id === id && p.projectId === projectId
  );
  if (index === -1) return false;
  purchasesStore.splice(index, 1);
  savePurchasesToStorage(purchasesStore);
  return true;
}

// ============================================
// النثريات - Store (تخزين مؤقت)
// ============================================
export interface MiscStoreItem {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  category: "food" | "transport" | "tools" | "other";
  date: string;
  notes?: string;
  createdBy: string;
  invoiceFile?: {
    name: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: string;
  };
}

// ✅ Store للنثريات
let miscStore: MiscStoreItem[] = [];

const loadMiscFromStorage = (): MiscStoreItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("elwataniya_misc");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return [];
};

const saveMiscToStorage = (data: MiscStoreItem[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("elwataniya_misc", JSON.stringify(data));
  } catch {
    // ignore
  }
};

miscStore = loadMiscFromStorage();

export function getMiscellaneous(projectId: string): MiscStoreItem[] {
  return miscStore.filter((m) => m.projectId === projectId);
}

export function addMiscellaneous(
  projectId: string,
  item: Omit<MiscStoreItem, "id" | "projectId">
): MiscStoreItem {
  const newItem: MiscStoreItem = {
    ...item,
    id: Date.now().toString(),
    projectId,
  };
  miscStore = [newItem, ...miscStore];
  saveMiscToStorage(miscStore);
  return newItem;
}

export function updateMiscellaneous(
  projectId: string,
  id: string,
  data: Partial<MiscStoreItem>
): MiscStoreItem | null {
  const index = miscStore.findIndex(
    (m) => m.id === id && m.projectId === projectId
  );
  if (index === -1) return null;
  miscStore[index] = { ...miscStore[index], ...data };
  saveMiscToStorage(miscStore);
  return miscStore[index];
}

export function deleteMiscellaneous(projectId: string, id: string): boolean {
  const index = miscStore.findIndex(
    (m) => m.id === id && m.projectId === projectId
  );
  if (index === -1) return false;
  miscStore.splice(index, 1);
  saveMiscToStorage(miscStore);
  return true;
}

// ============================================
// دوال ربط المشتريات بالمخازن
// ============================================
export function getPendingPurchases(projectId: string): PurchaseStoreItem[] {
  return purchasesStore.filter(
    (p) => p.projectId === projectId && !p.addedToInventory
  );
}

/**
 * ✅ تحديث حالة المشتريات (تمت الإضافة للمخزن)
 */
export function markPurchaseAddedToInventory(
  projectId: string,
  purchaseId: string,
  inventoryItemId: string
): PurchaseStoreItem | null {
  const index = purchasesStore.findIndex(
    (p) => p.id === purchaseId && p.projectId === projectId
  );
  if (index === -1) return null;
  purchasesStore[index] = {
    ...purchasesStore[index],
    addedToInventory: true,
    inventoryItemId,
  };
  savePurchasesToStorage(purchasesStore);
  return purchasesStore[index];
}

/**
 * ✅ إضافة صنف للمخزن من المشتريات
 */
export function addItemToInventoryFromPurchase(
  projectId: string,
  purchaseId: string,
  inventoryItem: {
    code: string;
    name: string;
    category: string;
    unit: string;
    price: number;
    location: string;
    minQuantity: number;
    previousBalance: number;
  }
): InventoryStoreItem | null {
  // البحث عن الصنف في المخزن
  const existingItem = inventoryStore.find(
    (item) =>
      item.code.toLowerCase() === inventoryItem.code.toLowerCase() ||
      item.name.toLowerCase() === inventoryItem.name.toLowerCase()
  );

  const purchase = purchasesStore.find(
    (p) => p.id === purchaseId && p.projectId === projectId
  );
  if (!purchase) return null;

  if (existingItem) {
    // ✅ تحديث الصنف الموجود (إضافة للوارد والإجمالي)
    const updatedItem = {
      ...existingItem,
      incoming: existingItem.incoming + purchase.quantity,
      quantity: existingItem.quantity + purchase.quantity,
      total: existingItem.total + purchase.quantity,
      transactions: [
        ...existingItem.transactions,
        {
          id: `tx-${Date.now()}`,
          type: "in" as const,
          quantity: purchase.quantity,
          date: new Date().toISOString().split("T")[0],
          source: `شراء: ${purchase.name}`,
        },
      ],
    };
    inventoryStore = inventoryStore.map((item) =>
      item.id === existingItem!.id ? updatedItem : item
    );
    saveInventoryToStorage(inventoryStore);
    markPurchaseAddedToInventory(projectId, purchaseId, existingItem.id);
    return updatedItem;
  } else {
    // ✅ إضافة صنف جديد
    const newItem: InventoryStoreItem = {
      id: `inv-${Date.now()}`,
      code: inventoryItem.code,
      name: inventoryItem.name,
      category: inventoryItem.category,
      quantity: purchase.quantity,
      unit: inventoryItem.unit,
      price: inventoryItem.price,
      location: inventoryItem.location,
      minQuantity: inventoryItem.minQuantity,
      previousBalance: 0,
      incoming: purchase.quantity,
      outgoing: 0,
      total: purchase.quantity,
      transactions: [
        {
          id: `tx-${Date.now()}`,
          type: "in" as const,
          quantity: purchase.quantity,
          date: new Date().toISOString().split("T")[0],
          source: `شراء: ${purchase.name}`,
        },
      ],
    };
    inventoryStore = [newItem, ...inventoryStore];
    saveInventoryToStorage(inventoryStore);
    markPurchaseAddedToInventory(projectId, purchaseId, newItem.id);
    return newItem;
  }
}
