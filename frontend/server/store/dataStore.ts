// server/store/dataStore.ts

import type {
  ContractorExtract,
  ContractorPayment,
  ExtractItem,
} from "@/types/boq";
import type {
  FundTransaction,
  MiscellaneousRecord,
  ProjectFund,
  PurchaseRecord,
  TreasuryTransaction,
} from "@/types/finance";

const extracts = new Map<string, ContractorExtract[]>();
const payments = new Map<string, ContractorPayment[]>();
const treasury = new Map<string, TreasuryTransaction[]>();
const funds = new Map<string, ProjectFund>();
const purchases = new Map<string, PurchaseRecord[]>();
const miscellaneous = new Map<string, MiscellaneousRecord[]>();

const ck = (buildingId: string, contractorId: string) =>
  `${buildingId}:${contractorId}`;

function seed() {
  if (extracts.has("1:1")) return;

  const seedExtract: ContractorExtract = {
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
  };

  extracts.set("1:1", [seedExtract]);
  payments.set("1:1", [
    {
      id: "pay1",
      buildingId: "1",
      contractorId: "1",
      date: "2024-06-10",
      amount: 34200,
      extractId: "ex1",
      notes: "دفعة مستخلص جاري 1",
    },
  ]);

  treasury.set("1", [
    {
      id: "tx-init-1",
      projectId: "1",
      sourceType: "initial",
      sourceId: "init-1",
      amount: 2000000,
      description: "رصيد ابتدائي للمشروع",
      date: "2024-06-01",
    },
    {
      id: "tx-ex1",
      projectId: "1",
      sourceType: "extract",
      sourceId: "ex1",
      amount: -34200,
      description: "مستخلص جاري 1 — محمد أبو كريم",
      date: "2024-06-10",
      metadata: {
        buildingId: "1",
        contractorId: "1",
        extractLabel: "جاري 1",
      },
    },
    {
      id: "tx-purchase-1",
      projectId: "1",
      sourceType: "purchase",
      sourceId: "p-1",
      amount: -50000,
      description: "شراء أسمنت",
      date: "2024-06-05",
    },
  ]);

  funds.set("1", {
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
    ],
  });

  purchases.set("1", [
    {
      id: "p-1",
      projectId: "1",
      name: "أسمنت",
      quantity: 100,
      unit: "كيس",
      price: 500,
      total: 50000,
      date: "2024-06-05",
      supplier: "مورد الأسمنت",
    },
  ]);

  miscellaneous.set("1", [
    {
      id: "m-1",
      projectId: "1",
      description: "وجبات عمال",
      amount: 2500,
      category: "food",
      date: "2024-06-01",
      createdBy: "مدير الموقع",
    },
  ]);
}

seed();

export function getExtractsStore(buildingId: string, contractorId: string) {
  return [...(extracts.get(ck(buildingId, contractorId)) || [])];
}

export function getExtractByIdStore(
  buildingId: string,
  contractorId: string,
  extractId: string
) {
  return getExtractsStore(buildingId, contractorId).find(
    (e) => e.id === extractId
  );
}

export function saveExtractStore(extract: ContractorExtract) {
  const key = ck(extract.buildingId, extract.contractorId);
  const list = getExtractsStore(extract.buildingId, extract.contractorId);
  const idx = list.findIndex((e) => e.id === extract.id);
  const next = [...list];
  if (idx >= 0) next[idx] = extract;
  else next.push(extract);
  extracts.set(key, next);
  return extract;
}

export function deleteExtractStore(
  buildingId: string,
  contractorId: string,
  extractId: string
) {
  const key = ck(buildingId, contractorId);
  const existing = getExtractByIdStore(buildingId, contractorId, extractId);
  const projectId = existing?.projectId;

  extracts.set(
    key,
    getExtractsStore(buildingId, contractorId).filter((e) => e.id !== extractId)
  );
  payments.set(
    key,
    getPaymentsStore(buildingId, contractorId).filter(
      (p) => p.extractId !== extractId
    )
  );

  if (projectId) {
    treasury.set(
      projectId,
      getTreasuryStore(projectId).filter((t) => t.sourceId !== extractId)
    );
  }
}

export function getPaymentsStore(buildingId: string, contractorId: string) {
  return [...(payments.get(ck(buildingId, contractorId)) || [])];
}

export function savePaymentStore(payment: ContractorPayment) {
  const key = ck(payment.buildingId, payment.contractorId);
  const list = getPaymentsStore(payment.buildingId, payment.contractorId);
  const idx = list.findIndex((p) => p.id === payment.id);
  const next = [...list];
  if (idx >= 0) next[idx] = payment;
  else next.push(payment);
  payments.set(key, next);
  return payment;
}

export function deletePaymentByExtractStore(
  buildingId: string,
  contractorId: string,
  extractId: string
) {
  const key = ck(buildingId, contractorId);
  payments.set(
    key,
    getPaymentsStore(buildingId, contractorId).filter(
      (p) => p.extractId !== extractId
    )
  );
}

export function getTreasuryStore(projectId: string) {
  return [...(treasury.get(projectId) || [])];
}

export function addTreasuryTxStore(tx: TreasuryTransaction) {
  const list = getTreasuryStore(tx.projectId);
  treasury.set(tx.projectId, [tx, ...list]);
  return tx;
}

export function upsertTreasuryBySourceStore(
  projectId: string,
  sourceType: TreasuryTransaction["sourceType"],
  sourceId: string,
  tx: Omit<
    TreasuryTransaction,
    "id" | "projectId" | "sourceType" | "sourceId"
  > & {
    id?: string;
  }
) {
  const list = getTreasuryStore(projectId);
  const idx = list.findIndex(
    (t) => t.sourceType === sourceType && t.sourceId === sourceId
  );
  const entry: TreasuryTransaction = {
    id: tx.id || `tx-${Date.now()}`,
    projectId,
    sourceType,
    sourceId,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    metadata: tx.metadata,
  };
  const next = [...list];
  if (idx >= 0) next[idx] = entry;
  else next.unshift(entry);
  treasury.set(projectId, next);
  return entry;
}

export function removeTreasuryBySourceStore(
  projectId: string,
  sourceType: TreasuryTransaction["sourceType"],
  sourceId: string
) {
  treasury.set(
    projectId,
    getTreasuryStore(projectId).filter(
      (t) => !(t.sourceType === sourceType && t.sourceId === sourceId)
    )
  );
}

export function getFundStore(projectId: string): ProjectFund | undefined {
  return funds.get(projectId);
}

export function saveFundStore(fund: ProjectFund) {
  funds.set(fund.projectId, fund);
  return fund;
}

export function addFundTransactionStore(
  projectId: string,
  tx: FundTransaction
): ProjectFund {
  const fund = getFundStore(projectId) || {
    id: `pf-${projectId}`,
    projectId,
    initialBalance: 0,
    currentBalance: 0,
    lastUpdated: new Date().toISOString().split("T")[0],
    transactions: [],
  };

  const delta = tx.type === "add" ? tx.amount : -tx.amount;
  const updated: ProjectFund = {
    ...fund,
    currentBalance: fund.currentBalance + delta,
    lastUpdated: new Date().toISOString().split("T")[0],
    transactions: [tx, ...fund.transactions],
  };
  funds.set(projectId, updated);
  return updated;
}

export function getPurchasesStore(projectId: string) {
  return [...(purchases.get(projectId) || [])];
}

export function savePurchaseStore(record: PurchaseRecord) {
  const list = getPurchasesStore(record.projectId);
  purchases.set(record.projectId, [record, ...list]);
  return record;
}

export function getMiscellaneousStore(projectId: string) {
  return [...(miscellaneous.get(projectId) || [])];
}

export function saveMiscellaneousStore(record: MiscellaneousRecord) {
  const list = getMiscellaneousStore(record.projectId);
  miscellaneous.set(record.projectId, [record, ...list]);
  return record;
}

export function getPreviousQuantitiesStore(
  buildingId: string,
  contractorId: string,
  runningNumber?: number
): Record<string, number> {
  const list = getExtractsStore(buildingId, contractorId);
  if (!runningNumber || runningNumber <= 1) return {};

  const prev = list
    .filter(
      (e) => e.status === "running" && e.runningNumber === runningNumber - 1
    )
    .sort((a, b) => (a.runningNumber || 0) - (b.runningNumber || 0))[0];

  if (!prev) return {};
  const map: Record<string, number> = {};
  prev.items.forEach((i) => {
    map[i.itemCode] = i.total;
  });
  return map;
}

export function getPreviousPaidStore(
  buildingId: string,
  contractorId: string,
  beforeRunningNumber?: number
): number {
  const list = getExtractsStore(buildingId, contractorId);
  return list
    .filter((e) => {
      if (e.status !== "running") return false;
      if (!beforeRunningNumber) return true;
      return (e.runningNumber || 0) < beforeRunningNumber;
    })
    .reduce((sum, e) => sum + e.netPayable, 0);
}

export function nextRunningNumberStore(
  buildingId: string,
  contractorId: string
): number {
  const list = getExtractsStore(buildingId, contractorId).filter(
    (e) => e.status === "running"
  );
  return list.length
    ? Math.max(...list.map((e) => e.runningNumber || 0)) + 1
    : 1;
}

export function validateExtractItemsStore(
  items: ExtractItem[],
  maxByCode: Record<string, number>
): { ok: boolean; error?: string } {
  for (const item of items) {
    const max = maxByCode[item.itemCode];
    if (max === undefined) continue;
    if (item.total > max) {
      return {
        ok: false,
        error: `الكمية المنفذة للبند ${item.itemCode} تتجاوز الكمية المسندة (${max})`,
      };
    }
  }
  return { ok: true };
}
