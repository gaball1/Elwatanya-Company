// lib/boqStore.ts

import type {
  AnalyticalBoqItem,
  ContractorBoqItem,
  ContractorBoqMeta,
  ContractorExtract,
  ContractorPayment,
  EmployerBoqItem,
  ExtractItem,
  FinalBoqItem,
  FinalBoqComponent,
  ComponentDistribution,
} from "@/types/boq";
import { mockSubcontractors } from "./mockData";

// ============================================
// ✅ توليد كود فريد للبنود (Random Code)
// ============================================
const getNextCode = (prefix: string): string => {
  const key = `boq_code_${prefix}`;
  let counter = 0;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      counter = parseInt(stored, 10);
    }
  } catch {
    // ignore
  }
  counter += 1;
  try {
    localStorage.setItem(key, counter.toString());
  } catch {
    // ignore
  }
  return `${prefix}-${String(counter).padStart(3, "0")}`;
};

export function generateEmployerCode(): string {
  return getNextCode("EMP");
}

export function generateAnalyticalCode(): string {
  return getNextCode("ANL");
}

export function generateFinalCode(): string {
  return getNextCode("FIN");
}

export function generateContractorCode(): string {
  return getNextCode("CON");
}

// ============================================
// ✅ Store - التخزين المؤقت
// ============================================
const employer = new Map<string, EmployerBoqItem[]>();
const analytical = new Map<string, AnalyticalBoqItem[]>();
const finalBoq = new Map<string, FinalBoqItem[]>();
const contractorBoq = new Map<string, ContractorBoqItem[]>();
const contractorMeta = new Map<string, ContractorBoqMeta>();
const extracts = new Map<string, ContractorExtract[]>();
const payments = new Map<string, ContractorPayment[]>();
const signatures = new Map<
  string,
  { id: string; name: string; title: string; date: string }[]
>();

const ck = (buildingId: string, contractorId: string) =>
  `${buildingId}:${contractorId}`;

function calcTotal(q: number, p: number) {
  return q * p;
}

// ============================================
// ✅ Seed - البيانات الأولية
// ============================================
function seed() {
  if (employer.has("1")) return;

  const items: EmployerBoqItem[] = [
    {
      itemCode: "CONC-001",
      description: "لبشة مسلحة",
      unit: "م³",
      quantity: 1000,
      unitPrice: 500,
      totalValue: 500000,
    },
    {
      itemCode: "EXC-001",
      description: "أعمال حفر",
      unit: "م³",
      quantity: 1000,
      unitPrice: 150,
      totalValue: 150000,
    },
    {
      itemCode: "REB-001",
      description: "أعمال حدادة",
      unit: "م³",
      quantity: 500,
      unitPrice: 200,
      totalValue: 100000,
    },
  ];
  employer.set("1", items);

  analytical.set(
    "1",
    items.map((i) => ({
      ...i,
      unitPrice:
        i.itemCode === "CONC-001" ? 500 : i.itemCode === "EXC-001" ? 120 : 180,
      totalValue:
        i.quantity *
        (i.itemCode === "CONC-001"
          ? 500
          : i.itemCode === "EXC-001"
          ? 120
          : 180),
    }))
  );

  // ✅ Final BOQ مع بيانات التحليل
  finalBoq.set("1", [
    {
      itemCode: "CONC-001",
      description: "لبشة مسلحة",
      unit: "م³",
      quantity: 1000,
      unitPrice: 500,
      totalValue: 500000,
      remainingQuantity: 1000,
      isAnalyzed: true,
      status: "analyzed",
      components: [
        {
          id: "comp-1",
          name: "نجارة",
          unit: "م³",
          quantity: 1000,
          unitPrice: 100,
          totalValue: 100000,
          isDistributed: false,
          distribution: [],
          remainingQuantity: 1000,
        },
        {
          id: "comp-2",
          name: "خرسانة",
          unit: "م³",
          quantity: 1000,
          unitPrice: 250,
          totalValue: 250000,
          isDistributed: false,
          distribution: [],
          remainingQuantity: 1000,
        },
        {
          id: "comp-3",
          name: "حدادة",
          unit: "م³",
          quantity: 1000,
          unitPrice: 150,
          totalValue: 150000,
          isDistributed: false,
          distribution: [],
          remainingQuantity: 1000,
        },
      ],
    },
    {
      itemCode: "EXC-001",
      description: "أعمال حفر",
      unit: "م³",
      quantity: 1000,
      unitPrice: 150,
      totalValue: 150000,
      remainingQuantity: 500,
      isAnalyzed: false,
      status: "pending",
      components: [],
    },
    {
      itemCode: "REB-001",
      description: "أعمال حدادة",
      unit: "م³",
      quantity: 500,
      unitPrice: 200,
      totalValue: 100000,
      remainingQuantity: 500,
      isAnalyzed: false,
      status: "pending",
      components: [],
    },
  ]);

  contractorBoq.set("1:1", [
    {
      itemCode: "EXC-001",
      description: "أعمال حفر",
      unit: "م³",
      quantity: 500,
      assignedQuantity: 500,
      unitPrice: 120,
      totalValue: 60000,
      componentId: undefined,
      finalItemId: undefined,
    },
  ]);

  contractorMeta.set("1:1", {
    buildingId: "1",
    contractorId: "1",
    workType: "حداد",
    createdAt: "2024-01-15",
  });

  extracts.set("1:1", [
    {
      id: "ex1",
      buildingId: "1",
      projectId: "1",
      contractorId: "1",
      date: "2024-06-01",
      status: "running",
      runningNumber: 1,
      label: "جاري 1",
      insurancePercent: 5,
      items: [
        {
          itemCode: "EXC-001",
          description: "أعمال حفر",
          unit: "م³",
          contractQuantity: 500,
          previous: 0,
          current: 300,
          total: 300,
          executionPercent: 100,
          executedQuantity: 300,
          unitPrice: 120,
          workValue: 36000,
        },
      ],
      deductions: [
        {
          id: "prev-0",
          name: "ماسبق صرفة",
          amount: 0,
          type: "previous_paid",
          readOnly: true,
        },
        {
          id: "ins-1",
          name: "تأمين أعمال المقاول الباطن",
          amount: 1800,
          percent: 5,
          type: "insurance",
        },
      ],
      totalWorkValue: 36000,
      previousPaid: 0,
      totalDeductions: 1800,
      netPayable: 34200,
      signatures: [],
    },
  ]);

  payments.set("1:1", [
    {
      id: "pay1",
      buildingId: "1",
      contractorId: "1",
      date: "2024-06-10",
      amount: 30000,
      extractId: "ex1",
      notes: "دفعة مستخلص جاري 1",
    },
  ]);
}
seed();

// ============================================
// ✅ دوال جهة الإسناد (Employer)
// ============================================
export function getEmployerItems(buildingId: string): EmployerBoqItem[] {
  return [...(employer.get(buildingId) || [])];
}

export function setEmployerItems(buildingId: string, items: EmployerBoqItem[]) {
  employer.set(buildingId, items);
}

// ✅ دالة مساعدة: تحديث التحليلية من جهة الإسناد
function syncAnalyticalFromEmployer(buildingId: string, itemCode: string) {
  const employerItem = getEmployerItems(buildingId).find(
    (i) => i.itemCode === itemCode
  );
  if (!employerItem) return;

  const analyticalList = getAnalyticalItems(buildingId);
  const existingIdx = analyticalList.findIndex((i) => i.itemCode === itemCode);

  if (existingIdx >= 0) {
    const updated = [...analyticalList];
    updated[existingIdx] = {
      ...employerItem,
      itemCode: employerItem.itemCode,
    };
    setAnalyticalItems(buildingId, updated);
  }
}

// ✅ دالة مساعدة: إضافة للتحليلية من جهة الإسناد
function addToAnalyticalFromEmployer(
  buildingId: string,
  item: EmployerBoqItem
) {
  const analyticalList = getAnalyticalItems(buildingId);
  const existing = analyticalList.find((i) => i.itemCode === item.itemCode);

  if (!existing) {
    const newItem: AnalyticalBoqItem = {
      ...item,
      itemCode: item.itemCode,
    };
    setAnalyticalItems(buildingId, [...analyticalList, newItem]);
  }
}

// ✅ تعديل upsertEmployerItem
export function upsertEmployerItem(
  buildingId: string,
  item: Omit<EmployerBoqItem, "itemCode"> & { itemCode?: string }
) {
  const list = getEmployerItems(buildingId);

  if (item.itemCode) {
    const idx = list.findIndex((i) => i.itemCode === item.itemCode);
    const next = [...list];
    const fullItem: EmployerBoqItem = {
      itemCode: item.itemCode,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalValue: item.quantity * item.unitPrice,
    };
    if (idx >= 0) {
      next[idx] = fullItem;
    } else {
      next.push(fullItem);
    }
    setEmployerItems(buildingId, next);
    syncAnalyticalFromEmployer(buildingId, item.itemCode);
    return;
  }

  const existing = list.find(
    (i) => i.description === item.description && i.unit === item.unit
  );

  if (existing) {
    const idx = list.findIndex((i) => i.itemCode === existing.itemCode);
    const next = [...list];
    next[idx] = {
      ...existing,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalValue: item.quantity * item.unitPrice,
    };
    setEmployerItems(buildingId, next);
    syncAnalyticalFromEmployer(buildingId, existing.itemCode);
    return;
  }

  const newCode = generateEmployerCode();
  const newItem: EmployerBoqItem = {
    itemCode: newCode,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalValue: item.quantity * item.unitPrice,
  };

  setEmployerItems(buildingId, [...list, newItem]);
  addToAnalyticalFromEmployer(buildingId, newItem);
}

// ============================================
// ✅ دوال المقايسة التحليلية (Analytical)
// ============================================
export function getAnalyticalItems(buildingId: string): AnalyticalBoqItem[] {
  return [...(analytical.get(buildingId) || [])];
}

export function setAnalyticalItems(
  buildingId: string,
  items: AnalyticalBoqItem[]
) {
  analytical.set(buildingId, items);
  syncFinalFromAnalytical(buildingId);
}

export function removeAnalyticalItem(buildingId: string, itemCode: string) {
  setAnalyticalItems(
    buildingId,
    getAnalyticalItems(buildingId).filter((i) => i.itemCode !== itemCode)
  );
}

// ✅ استيراد من جهة الإسناد للتحليلية (بنفس الكود)
export function importAnalyticalFromEmployer(
  buildingId: string,
  itemCode: string
): AnalyticalBoqItem | null {
  const src = getEmployerItems(buildingId).find((i) => i.itemCode === itemCode);
  if (!src) return null;

  const list = getAnalyticalItems(buildingId);
  const existing = list.find((i) => i.itemCode === itemCode);

  if (existing) {
    return null;
  }

  const item: AnalyticalBoqItem = {
    ...src,
    itemCode: src.itemCode,
  };

  setAnalyticalItems(buildingId, [...list, item]);
  return item;
}

// ✅ تحديث بند تحليلي (كمية وسعر)
export function updateAnalyticalItem(
  buildingId: string,
  itemCode: string,
  patch: { quantity?: number; unitPrice?: number; description?: string }
): AnalyticalBoqItem | null {
  const list = getAnalyticalItems(buildingId);
  const idx = list.findIndex((i) => i.itemCode === itemCode);
  if (idx < 0) return null;

  const updated = {
    ...list[idx],
    ...patch,
    totalValue:
      (patch.quantity || list[idx].quantity) *
      (patch.unitPrice || list[idx].unitPrice),
  };

  analytical.set(buildingId, [
    ...list.slice(0, idx),
    updated,
    ...list.slice(idx + 1),
  ]);

  syncFinalFromAnalytical(buildingId);
  return updated;
}

// ============================================
// ✅ دوال المقايسة النهائية (Final BOQ)
// ============================================
export function getFinalItems(buildingId: string): FinalBoqItem[] {
  return [...(finalBoq.get(buildingId) || [])];
}

function getAllocatedQty(buildingId: string, itemCode: string): number {
  let sum = 0;
  contractorBoq.forEach((items, key) => {
    if (!key.startsWith(`${buildingId}:`)) return;
    const found = items.find((i) => i.itemCode === itemCode);
    if (found) sum += found.assignedQuantity;
  });
  return sum;
}

// ✅ دالة مساعدة: حساب الكمية الموزعة من مكون معين
function getComponentAllocatedQty(
  buildingId: string,
  itemCode: string,
  componentId: string
): number {
  let sum = 0;
  contractorBoq.forEach((items) => {
    const found = items.find(
      (i) => i.itemCode === itemCode && i.componentId === componentId
    );
    if (found) sum += found.assignedQuantity;
  });
  return sum;
}

// ✅ حساب الإجماليات للـ Final BOQ
export function calculateFinalTotals(buildingId: string) {
  const items = getFinalItems(buildingId);
  const totals = items.reduce((acc, item) => {
    acc.quantity += item.quantity;
    acc.remainingQuantity += item.remainingQuantity;
    acc.totalValue += item.totalValue;
    return acc;
  }, { quantity: 0, remainingQuantity: 0, totalValue: 0 });
  return totals;
}

export function syncFinalItemState(buildingId: string, itemCode: string) {
  const finalList = getFinalItems(buildingId);
  const finalIdx = finalList.findIndex((f) => f.itemCode === itemCode);
  if (finalIdx < 0) return;

  const item = { ...finalList[finalIdx] };
  const allocated = getAllocatedQty(buildingId, itemCode);

  if (item.isAnalyzed && item.components.length > 0) {
    const subcontractors = mockSubcontractors;
    item.components = item.components.map((comp) => {
      let compAllocated = 0;
      const newDistribution: ComponentDistribution[] = [];

      contractorBoq.forEach((items, key) => {
        if (!key.startsWith(`${buildingId}:`)) return;
        const contractorId = key.split(":")[1];
        const found = items.find(
          (i) => i.itemCode === itemCode && i.componentId === comp.id
        );
        if (found) {
          compAllocated += found.assignedQuantity;
          const sub = subcontractors.find((s) => s.id === contractorId);
          newDistribution.push({
            contractorId,
            contractorName: sub?.name || contractorId,
            quantity: found.assignedQuantity,
            percentage: (found.assignedQuantity / comp.quantity) * 100,
            assignedAt: new Date().toISOString(),
          });
        }
      });

      return {
        ...comp,
        remainingQuantity: Math.max(0, comp.quantity - compAllocated),
        isDistributed: compAllocated >= comp.quantity,
        distribution: newDistribution,
      };
    });

    const allDistributed = item.components.every((c) => c.isDistributed);
    const anyDistributed = item.components.some((c) => c.isDistributed);
    item.status = allDistributed
      ? "distributed"
      : anyDistributed
      ? "partial"
      : "analyzed";
    
    item.remainingQuantity = Math.max(0, item.quantity - allocated);
  } else {
    item.remainingQuantity = Math.max(0, item.quantity - allocated);
    if (allocated >= item.quantity) {
      item.status = "distributed";
    } else if (allocated > 0) {
      item.status = "partial";
    } else {
      item.status = "pending";
    }
  }

  const nextList = [...finalList];
  nextList[finalIdx] = item;
  finalBoq.set(buildingId, nextList);
}

export function recalcFinalRemaining(buildingId: string, itemCode: string) {
  syncFinalItemState(buildingId, itemCode);
}

// ✅ النهائية تاخد من التحليلية مع الحفاظ على التوزيعات وتحديث الحالة
function syncFinalFromAnalytical(buildingId: string) {
  const analyticalItems = getAnalyticalItems(buildingId);
  const current = getFinalItems(buildingId);

  const next: FinalBoqItem[] = analyticalItems.map((a) => {
    const existing = current.find((f) => f.itemCode === a.itemCode);
    const allocated = getAllocatedQty(buildingId, a.itemCode);

    if (existing) {
      // ✅ حساب الكميات الجديدة للمكونات مع الحفاظ على التوزيعات
      const updatedComponents = existing.components.map((comp) => {
        const ratio = a.quantity / existing.quantity;
        const newCompQty = Math.round(comp.quantity * ratio * 100) / 100;
        const compAllocated = getComponentAllocatedQty(
          buildingId,
          a.itemCode,
          comp.id
        );
        
        const newDistribution: ComponentDistribution[] = [];
        const subcontractors = mockSubcontractors;
        contractorBoq.forEach((items, key) => {
          if (!key.startsWith(`${buildingId}:`)) return;
          const contractorId = key.split(":")[1];
          const found = items.find(
            (i) => i.itemCode === a.itemCode && i.componentId === comp.id
          );
          if (found) {
            const sub = subcontractors.find((s) => s.id === contractorId);
            newDistribution.push({
              contractorId,
              contractorName: sub?.name || contractorId,
              quantity: found.assignedQuantity,
              percentage: (found.assignedQuantity / newCompQty) * 100,
              assignedAt: new Date().toISOString(),
            });
          }
        });

        return {
          ...comp,
          quantity: newCompQty,
          totalValue: newCompQty * comp.unitPrice,
          remainingQuantity: Math.max(0, newCompQty - compAllocated),
          distribution: newDistribution,
          isDistributed: compAllocated >= newCompQty,
        };
      });

      // ✅ تحديد الحالة بناءً على المكونات والتوزيع
      let newStatus: FinalBoqItem["status"];
      const hasComponents = updatedComponents.length > 0;
      if (hasComponents) {
        const allDistributed = updatedComponents.every((c) => c.isDistributed);
        const anyDistributed = updatedComponents.some((c) => c.isDistributed);
        if (allDistributed) {
          newStatus = "distributed";
        } else if (anyDistributed) {
          newStatus = "partial";
        } else {
          newStatus = "analyzed";
        }
      } else {
        if (allocated >= a.quantity) {
          newStatus = "distributed";
        } else if (allocated > 0) {
          newStatus = "partial";
        } else {
          newStatus = "pending";
        }
      }

      return {
        ...a,
        remainingQuantity: Math.max(0, a.quantity - allocated),
        isAnalyzed: hasComponents,
        status: newStatus,
        components: updatedComponents,
      };
    }

    // ✅ لو البند جديد
    return {
      ...a,
      remainingQuantity: a.quantity - allocated,
      isAnalyzed: false,
      status: "pending" as const,
      components: [],
    };
  });

  finalBoq.set(buildingId, next);
}

export function importFinalFromEmployer(
  buildingId: string,
  itemCode: string
): FinalBoqItem | null {
  const src = getEmployerItems(buildingId).find((i) => i.itemCode === itemCode);
  if (!src) return null;
  const list = getFinalItems(buildingId);
  if (list.some((i) => i.itemCode === itemCode)) {
    recalcFinalRemaining(buildingId, itemCode);
    return list.find((i) => i.itemCode === itemCode) || null;
  }

  const item: FinalBoqItem = {
    ...src,
    itemCode: src.itemCode,
    remainingQuantity: src.quantity,
    isAnalyzed: false,
    status: "pending" as const,
    components: [],
  };
  finalBoq.set(buildingId, [...list, item]);
  recalcFinalRemaining(buildingId, itemCode);
  return item;
}

export function updateFinalItem(
  buildingId: string,
  itemCode: string,
  patch: Partial<FinalBoqItem>
) {
  const list = getFinalItems(buildingId);
  finalBoq.set(
    buildingId,
    list.map((i) => {
      if (i.itemCode === itemCode) {
        const updated = { ...i, ...patch };
        if (patch.status) {
          updated.status = patch.status as FinalBoqItem["status"];
        }
        return updated;
      }
      return i;
    })
  );
  recalcFinalRemaining(buildingId, itemCode);
}

export function removeFinalItem(buildingId: string, itemCode: string) {
  finalBoq.set(
    buildingId,
    getFinalItems(buildingId).filter((i) => i.itemCode !== itemCode)
  );
}

// ============================================
// ✅ دوال التحليل (Analysis)
// ============================================

export function analyzeFinalItem(
  buildingId: string,
  itemCode: string,
  components: { name: string; unit: string; unitPrice: number }[]
): FinalBoqItem | null {
  const list = getFinalItems(buildingId);
  const idx = list.findIndex((i) => i.itemCode === itemCode);
  if (idx < 0) return null;

  const item = list[idx];
  const newComponents: FinalBoqComponent[] = components.map((c, index) => ({
    id: `comp-${Date.now()}-${index}`,
    name: c.name,
    unit: c.unit,
    quantity: item.quantity,
    unitPrice: c.unitPrice,
    totalValue: item.quantity * c.unitPrice,
    isDistributed: false,
    distribution: [],
    remainingQuantity: item.quantity,
  }));

  const updated: FinalBoqItem = {
    ...item,
    isAnalyzed: true,
    status: "analyzed" as const,
    components: newComponents,
  };

  finalBoq.set(buildingId, [
    ...list.slice(0, idx),
    updated,
    ...list.slice(idx + 1),
  ]);

  return updated;
}

export function addComponentToFinalItem(
  buildingId: string,
  itemCode: string,
  component: { name: string; unit: string; unitPrice: number }
): FinalBoqItem | null {
  const list = getFinalItems(buildingId);
  const idx = list.findIndex((i) => i.itemCode === itemCode);
  if (idx < 0) return null;

  const item = list[idx];
  const newComponent: FinalBoqComponent = {
    id: `comp-${Date.now()}`,
    name: component.name,
    unit: component.unit,
    quantity: item.quantity,
    unitPrice: component.unitPrice,
    totalValue: item.quantity * component.unitPrice,
    isDistributed: false,
    distribution: [],
    remainingQuantity: item.quantity,
  };

  const updated: FinalBoqItem = {
    ...item,
    isAnalyzed: true,
    components: [...item.components, newComponent],
  };

  finalBoq.set(buildingId, [
    ...list.slice(0, idx),
    updated,
    ...list.slice(idx + 1),
  ]);

  return updated;
}

export function removeComponentFromFinalItem(
  buildingId: string,
  itemCode: string,
  componentId: string
): FinalBoqItem | null {
  const list = getFinalItems(buildingId);
  const idx = list.findIndex((i) => i.itemCode === itemCode);
  if (idx < 0) return null;

  const item = list[idx];
  const updated = {
    ...item,
    components: item.components.filter((c) => c.id !== componentId),
  };

  finalBoq.set(buildingId, [
    ...list.slice(0, idx),
    updated,
    ...list.slice(idx + 1),
  ]);

  return updated;
}

export function updateComponentPrice(
  buildingId: string,
  itemCode: string,
  componentId: string,
  newPrice: number
): FinalBoqItem | null {
  const list = getFinalItems(buildingId);
  const idx = list.findIndex((i) => i.itemCode === itemCode);
  if (idx < 0) return null;

  const item = list[idx];
  const updated = {
    ...item,
    components: item.components.map((c) =>
      c.id === componentId
        ? { ...c, unitPrice: newPrice, totalValue: c.quantity * newPrice }
        : c
    ),
  };

  finalBoq.set(buildingId, [
    ...list.slice(0, idx),
    updated,
    ...list.slice(idx + 1),
  ]);

  return updated;
}

export function updateComponentQuantity(
  buildingId: string,
  itemCode: string,
  componentId: string,
  newQuantity: number
): FinalBoqItem | null {
  const list = getFinalItems(buildingId);
  const idx = list.findIndex((i) => i.itemCode === itemCode);
  if (idx < 0) return null;

  const item = list[idx];
  if (newQuantity > item.quantity) {
    return null;
  }

  const updated = {
    ...item,
    components: item.components.map((c) =>
      c.id === componentId
        ? {
            ...c,
            quantity: newQuantity,
            totalValue: newQuantity * c.unitPrice,
          }
        : c
    ),
  };

  finalBoq.set(buildingId, [
    ...list.slice(0, idx),
    updated,
    ...list.slice(idx + 1),
  ]);

  return updated;
}

export function getFinalItemComponents(
  buildingId: string,
  itemCode: string
): FinalBoqComponent[] {
  const item = getFinalItems(buildingId).find((i) => i.itemCode === itemCode);
  return item?.components || [];
}

// ============================================
// ✅ دوال توزيع المكونات (Distribution)
// ============================================

export function distributeComponent(
  buildingId: string,
  itemCode: string,
  componentId: string,
  distribution: { contractorId: string; quantity: number }[]
): { ok: boolean; error?: string } {
  const list = getFinalItems(buildingId);
  const idx = list.findIndex((i) => i.itemCode === itemCode);
  if (idx < 0) return { ok: false, error: "البند غير موجود" };

  const item = list[idx];
  const componentIdx = item.components.findIndex((c) => c.id === componentId);
  if (componentIdx < 0) return { ok: false, error: "المكون غير موجود" };

  const component = item.components[componentIdx];

  const totalDistributed = distribution.reduce((sum, d) => sum + d.quantity, 0);
  if (totalDistributed !== component.quantity) {
    return {
      ok: false,
      error: `مجموع الكميات الموزعة (${totalDistributed}) لا يساوي كمية المكون (${component.quantity})`,
    };
  }

  for (const d of distribution) {
    if (d.quantity <= 0) {
      return {
        ok: false,
        error: `الكمية الموزعة على المقاول ${d.contractorId} يجب أن تكون أكبر من صفر`,
      };
    }
  }

  const subcontractors = mockSubcontractors;

  const newDistribution: ComponentDistribution[] = distribution.map((d) => {
    const sub = subcontractors.find((s) => s.id === d.contractorId);
    return {
      contractorId: d.contractorId,
      contractorName: sub?.name || d.contractorId,
      quantity: d.quantity,
      percentage: (d.quantity / component.quantity) * 100,
      assignedAt: new Date().toISOString(),
    };
  });

  const updatedComponents = [...item.components];
  updatedComponents[componentIdx] = {
    ...component,
    isDistributed: true,
    distribution: newDistribution,
    remainingQuantity: 0,
  };

  const allDistributed = updatedComponents.every((c) => c.isDistributed);
  const anyDistributed = updatedComponents.some((c) => c.isDistributed);

  let newStatus: FinalBoqItem["status"];
  if (allDistributed && updatedComponents.length > 0) {
    newStatus = "distributed";
  } else if (anyDistributed) {
    newStatus = "partial";
  } else if (updatedComponents.length > 0) {
    newStatus = "analyzed";
  } else {
    newStatus = "pending";
  }

  const updated: FinalBoqItem = {
    ...item,
    components: updatedComponents,
    status: newStatus,
  };

  finalBoq.set(buildingId, [
    ...list.slice(0, idx),
    updated,
    ...list.slice(idx + 1),
  ]);

  // ✅ إنشاء بنود في مقايسة المقاولين
  for (const d of distribution) {
    const contractorKey = ck(buildingId, d.contractorId);
    const existing = getContractorBoq(buildingId, d.contractorId);

    const existingItem = existing.find(
      (i) => i.itemCode === itemCode && i.componentId === componentId
    );

    const newItem: ContractorBoqItem = {
      itemCode: itemCode,
      description: `${component.name} (${item.description})`,
      unit: component.unit,
      quantity: d.quantity,
      assignedQuantity: d.quantity,
      unitPrice: component.unitPrice,
      totalValue: d.quantity * component.unitPrice,
      componentId: componentId,
      finalItemId: itemCode,
    };

    if (existingItem) {
      contractorBoq.set(
        contractorKey,
        existing.map((i) =>
          i.itemCode === itemCode && i.componentId === componentId
            ? { ...i, assignedQuantity: i.assignedQuantity + d.quantity }
            : i
        )
      );
    } else {
      contractorBoq.set(contractorKey, [...existing, newItem]);
    }
  }

  recalcFinalRemaining(buildingId, itemCode);

  return { ok: true };
}

// ============================================
// ✅ دوال المقاول (Contractor)
// ============================================
export function getContractorBoq(
  buildingId: string,
  contractorId: string
): ContractorBoqItem[] {
  return [...(contractorBoq.get(ck(buildingId, contractorId)) || [])];
}

export function getContractorMeta(buildingId: string, contractorId: string) {
  return contractorMeta.get(ck(buildingId, contractorId));
}

export function setContractorMeta(
  buildingId: string,
  contractorId: string,
  meta: ContractorBoqMeta
) {
  contractorMeta.set(ck(buildingId, contractorId), meta);
}

// ✅ allocateContractorItem - يدعم البنود العادية والمكونات
export function allocateContractorItem(
  buildingId: string,
  contractorId: string,
  itemCodeOrComponent: string,
  qty: number
): { ok: boolean; error?: string } {
  const parts = itemCodeOrComponent.split("|");
  const itemCode = parts[0];
  const componentId = parts.length > 1 ? parts[1] : undefined;

  const finalItems = getFinalItems(buildingId);
  const finalItem = finalItems.find((f) => f.itemCode === itemCode);

  if (!finalItem) {
    return { ok: false, error: "البند غير موجود في المقايسة النهائية" };
  }

  if (finalItem.isAnalyzed && finalItem.components.length > 0 && !componentId) {
    return {
      ok: false,
      error: "هذا البند متحلل، لا يمكن توزيعه مباشرة. يرجى توزيع المكونات.",
    };
  }

  let availableQuantity = finalItem.quantity;
  let unitPrice = finalItem.unitPrice;
  let description = finalItem.description;
  let unit = finalItem.unit;
  let actualComponentId: string | undefined = componentId;

  if (componentId) {
    const component = finalItem.components.find((c) => c.id === componentId);
    if (!component) {
      return { ok: false, error: "المكون غير موجود في البند" };
    }
    availableQuantity = component.remainingQuantity;
    unitPrice = component.unitPrice;
    description = `${component.name} (${finalItem.description})`;
    unit = component.unit;
    actualComponentId = componentId;
  }

  if (qty > availableQuantity) {
    return {
      ok: false,
      error: `الكمية المطلوبة (${qty}) أكبر من الكمية المتاحة (${availableQuantity})`,
    };
  }

  const key = ck(buildingId, contractorId);
  const list = getContractorBoq(buildingId, contractorId);

  const existingItem = list.find(
    (i) => i.itemCode === itemCode && i.componentId === actualComponentId
  );

  const newItem: ContractorBoqItem = {
    itemCode: itemCode,
    description: description,
    unit: unit,
    quantity: qty,
    assignedQuantity: qty,
    unitPrice: unitPrice,
    totalValue: calcTotal(qty, unitPrice),
    componentId: actualComponentId,
    finalItemId: itemCode,
  };

  let nextList: ContractorBoqItem[];
  if (existingItem) {
    const newQty = existingItem.assignedQuantity + qty;
    nextList = list.map((i) =>
      i.itemCode === itemCode && i.componentId === actualComponentId
        ? {
            ...i,
            assignedQuantity: newQty,
            quantity: newQty,
            totalValue: calcTotal(newQty, unitPrice),
          }
        : i
    );
  } else {
    nextList = [...list, newItem];
  }

  contractorBoq.set(key, nextList);
  syncFinalItemState(buildingId, itemCode);

  return { ok: true };
}

export function updateContractorItemQuantity(
  buildingId: string,
  contractorId: string,
  itemCode: string,
  componentId: string | undefined,
  newQty: number
): { ok: boolean; error?: string } {
  const finalItems = getFinalItems(buildingId);
  const finalItem = finalItems.find((f) => f.itemCode === itemCode);
  if (!finalItem) return { ok: false, error: "البند غير موجود" };

  let totalAllocatedToOthers = 0;
  contractorBoq.forEach((items, key) => {
    if (!key.startsWith(`${buildingId}:`)) return;
    const cId = key.split(":")[1];
    if (cId === contractorId) return;
    const found = items.find(
      (i) => i.itemCode === itemCode && i.componentId === componentId
    );
    if (found) totalAllocatedToOthers += found.assignedQuantity;
  });

  let maxAllowed = finalItem.quantity;
  let unitPrice = finalItem.unitPrice;
  if (componentId) {
    const component = finalItem.components.find((c) => c.id === componentId);
    if (!component) return { ok: false, error: "المكون غير موجود" };
    maxAllowed = component.quantity;
    unitPrice = component.unitPrice;
  }

  const availableForThis = maxAllowed - totalAllocatedToOthers;
  if (newQty > availableForThis) {
    return {
      ok: false,
      error: `الكمية المطلوبة (${newQty}) تتجاوز المتاح (${availableForThis})`,
    };
  }

  const key = ck(buildingId, contractorId);
  const list = getContractorBoq(buildingId, contractorId);
  const nextList = list.map((i) => {
    if (i.itemCode === itemCode && i.componentId === componentId) {
      return {
        ...i,
        assignedQuantity: newQty,
        quantity: newQty,
        totalValue: calcTotal(newQty, unitPrice),
      };
    }
    return i;
  });

  contractorBoq.set(key, nextList);
  syncFinalItemState(buildingId, itemCode);
  return { ok: true };
}

export function getAvailableQtyForContractorItem(
  buildingId: string,
  contractorId: string,
  itemCode: string,
  componentId: string | undefined
): number {
  const finalItems = getFinalItems(buildingId);
  const finalItem = finalItems.find((f) => f.itemCode === itemCode);
  if (!finalItem) return 0;

  let maxAllowed = finalItem.quantity;
  if (componentId) {
    const comp = finalItem.components.find((c) => c.id === componentId);
    if (!comp) return 0;
    maxAllowed = comp.quantity;
  }

  let totalAllocatedToOthers = 0;
  contractorBoq.forEach((items, key) => {
    if (!key.startsWith(`${buildingId}:`)) return;
    const cId = key.split(":")[1];
    if (cId === contractorId) return;
    const found = items.find(
      (i) => i.itemCode === itemCode && i.componentId === componentId
    );
    if (found) totalAllocatedToOthers += found.assignedQuantity;
  });

  return Math.max(0, maxAllowed - totalAllocatedToOthers);
}

export function removeContractorItem(
  buildingId: string,
  contractorId: string,
  itemCode: string,
  componentId?: string
) {
  const key = ck(buildingId, contractorId);
  contractorBoq.set(
    key,
    getContractorBoq(buildingId, contractorId).filter(
      (i) => !(i.itemCode === itemCode && i.componentId === componentId)
    )
  );
  syncFinalItemState(buildingId, itemCode);
}

export function getContractorsForItemStore(
  buildingId: string,
  itemCode: string
): { contractorName: string; quantity: number }[] {
  const result: { contractorName: string; quantity: number }[] = [];
  const subcontractors = mockSubcontractors;

  contractorBoq.forEach((items, key) => {
    if (!key.startsWith(`${buildingId}:`)) return;
    const contractorId = key.split(":")[1];
    const sub = subcontractors.find((s) => s.id === contractorId);
    const contractorName = sub?.name || contractorId;

    let sum = 0;
    items.forEach((i) => {
      if (i.itemCode === itemCode) {
        sum += i.assignedQuantity;
      }
    });

    if (sum > 0) {
      result.push({ contractorName, quantity: sum });
    }
  });

  return result;
}

// ============================================
// ✅ دوال المستخلصات (Extracts)
// ============================================
export function getExtracts(buildingId: string, contractorId: string) {
  return [...(extracts.get(ck(buildingId, contractorId)) || [])];
}

export function calcExtractItem(
  item: Omit<ExtractItem, "total" | "executedQuantity" | "workValue">
): ExtractItem {
  const total = item.previous + item.current;
  const executedQuantity = total * (item.executionPercent / 100);
  const workValue = executedQuantity * item.unitPrice;
  return { ...item, total, executedQuantity, workValue };
}

export function getPreviousForExtract(
  buildingId: string,
  contractorId: string,
  status: "running" | "final",
  runningNumber?: number
): Record<string, number> {
  const list = getExtracts(buildingId, contractorId);
  if (status === "final" || runningNumber === 1) return {};

  const prev = list
    .filter(
      (e) =>
        e.status === "running" && e.runningNumber === (runningNumber || 1) - 1
    )
    .sort((a, b) => (a.runningNumber || 0) - (b.runningNumber || 0))[0];

  if (!prev) return {};
  const map: Record<string, number> = {};
  prev.items.forEach((i) => {
    map[i.itemCode] = i.total;
  });
  return map;
}

export function validateExtractItems(
  buildingId: string,
  contractorId: string,
  items: ExtractItem[]
): { ok: boolean; error?: string } {
  const boq = getContractorBoq(buildingId, contractorId);
  for (const item of items) {
    const contract = boq.find((b) => b.itemCode === item.itemCode);
    if (!contract) continue;
    if (item.total > contract.assignedQuantity) {
      return {
        ok: false,
        error: `الكمية المنفذة للبند ${item.itemCode} تتجاوز الكمية المسندة (${contract.assignedQuantity})`,
      };
    }
  }
  return { ok: true };
}

export function saveExtract(extract: ContractorExtract) {
  const key = ck(extract.buildingId, extract.contractorId);
  const list = getExtracts(extract.buildingId, extract.contractorId);
  const idx = list.findIndex((e) => e.id === extract.id);
  const next = [...list];
  if (idx >= 0) next[idx] = extract;
  else next.push(extract);
  extracts.set(key, next);
}

export function getExtractById(
  buildingId: string,
  contractorId: string,
  extractId: string
) {
  return getExtracts(buildingId, contractorId).find((e) => e.id === extractId);
}

export function deleteExtract(
  buildingId: string,
  contractorId: string,
  extractId: string
) {
  const key = ck(buildingId, contractorId);
  extracts.set(
    key,
    getExtracts(buildingId, contractorId).filter((e) => e.id !== extractId)
  );
}

export function getPayments(buildingId: string, contractorId: string) {
  return [...(payments.get(ck(buildingId, contractorId)) || [])];
}

export function addPayment(payment: ContractorPayment) {
  const key = ck(payment.buildingId, payment.contractorId);
  payments.set(key, [
    ...getPayments(payment.buildingId, payment.contractorId),
    payment,
  ]);
}

// ============================================
// ✅ دوال التوقيعات (Signatures)
// ============================================
export function getDocSignatures(
  docKey: string
): { id: string; name: string; title: string; date: string }[] {
  return [...(signatures.get(docKey) || [])];
}

export function setDocSignatures(
  docKey: string,
  sigs: { id: string; name: string; title: string; date: string }[]
) {
  signatures.set(docKey, sigs);
}

export function nextRunningNumber(buildingId: string, contractorId: string) {
  const list = getExtracts(buildingId, contractorId).filter(
    (e) => e.status === "running"
  );
  return list.length
    ? Math.max(...list.map((e) => e.runningNumber || 0)) + 1
    : 1;
}

// ============================================
// ✅ دوال التعديل في المقايسة النهائية
// ============================================

export function updateFinalItemQuantity(
  buildingId: string,
  itemCode: string,
  newQuantity: number,
  newUnitPrice?: number
): FinalBoqItem | null {
  const list = getFinalItems(buildingId);
  const idx = list.findIndex((i) => i.itemCode === itemCode);
  if (idx < 0) return null;

  const item = list[idx];
  
  // ✅ التحقق: لو الكمية الجديدة أقل من الموزع، امنع التعديل
  const allocated = getAllocatedQty(buildingId, itemCode);
  if (newQuantity < allocated) {
    return null;
  }

  const ratio = newQuantity / item.quantity;

  const updated: FinalBoqItem = {
    ...item,
    quantity: newQuantity,
    unitPrice: newUnitPrice || item.unitPrice,
    totalValue: newQuantity * (newUnitPrice || item.unitPrice),
  };

  if (item.isAnalyzed && item.components.length > 0) {
    updated.components = item.components.map((comp) => {
      const newCompQty = Math.round(comp.quantity * ratio * 100) / 100;
      const compAllocated = getComponentAllocatedQty(
        buildingId,
        itemCode,
        comp.id
      );
      
      const newDistribution: ComponentDistribution[] = [];
      const subcontractors = mockSubcontractors;
      contractorBoq.forEach((items, key) => {
        if (!key.startsWith(`${buildingId}:`)) return;
        const contractorId = key.split(":")[1];
        const found = items.find(
          (i) => i.itemCode === itemCode && i.componentId === comp.id
        );
        if (found) {
          const sub = subcontractors.find((s) => s.id === contractorId);
          newDistribution.push({
            contractorId,
            contractorName: sub?.name || contractorId,
            quantity: found.assignedQuantity,
            percentage: (found.assignedQuantity / newCompQty) * 100,
            assignedAt: new Date().toISOString(),
          });
        }
      });

      return {
        ...comp,
        quantity: newCompQty,
        totalValue: newCompQty * comp.unitPrice,
        remainingQuantity: Math.max(0, newCompQty - compAllocated),
        isDistributed: compAllocated >= newCompQty,
        distribution: newDistribution,
      };
    });

    const allDistributed = updated.components.every((c) => c.isDistributed);
    const anyDistributed = updated.components.some((c) => c.isDistributed);
    updated.status = allDistributed
      ? "distributed"
      : anyDistributed
      ? "partial"
      : "analyzed";
  } else {
    if (allocated >= newQuantity) {
      updated.status = "distributed";
    } else if (allocated > 0) {
      updated.status = "partial";
    } else {
      updated.status = "pending";
    }
  }

  updated.remainingQuantity = Math.max(0, newQuantity - allocated);

  finalBoq.set(buildingId, [
    ...list.slice(0, idx),
    updated,
    ...list.slice(idx + 1),
  ]);

  return updated;
}

export function updateComponentOnly(
  buildingId: string,
  itemCode: string,
  componentId: string,
  newUnitPrice: number
): FinalBoqItem | null {
  const list = getFinalItems(buildingId);
  const idx = list.findIndex((i) => i.itemCode === itemCode);
  if (idx < 0) return null;

  const item = list[idx];

  const updatedComponents = item.components.map((comp) =>
    comp.id === componentId
      ? {
          ...comp,
          unitPrice: newUnitPrice,
          totalValue: comp.quantity * newUnitPrice,
        }
      : comp
  );

  const updated: FinalBoqItem = {
    ...item,
    components: updatedComponents,
  };

  finalBoq.set(buildingId, [
    ...list.slice(0, idx),
    updated,
    ...list.slice(idx + 1),
  ]);

  return updated;
}