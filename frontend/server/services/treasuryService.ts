// lib/services/financeService.ts

import type {
  FundTransaction,
  MiscellaneousRecord,
  PurchaseRecord,
  TreasuryTransaction,
} from "@/types/finance";
import {
  addFundTransactionStore,
  addTreasuryTxStore,
  getFundStore,
  getMiscellaneousStore,
  getPurchasesStore,
  getTreasuryStore,
  saveFundStore,
  saveMiscellaneousStore,
  savePurchaseStore,
  upsertTreasuryBySourceStore,
} from "@/server/store/dataStore";

export function getProjectTreasury(projectId: string) {
  const transactions = getTreasuryStore(projectId).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let income = 0;
  let expenses = 0;
  transactions.forEach((t) => {
    if (t.amount > 0) income += t.amount;
    else expenses += Math.abs(t.amount);
  });

  return {
    transactions,
    totalIncome: income,
    totalExpenses: expenses,
    currentBalance: income - expenses,
  };
}

export function addTreasuryAdjustment(
  projectId: string,
  amount: number,
  description: string
): TreasuryTransaction {
  return addTreasuryTxStore({
    id: `tx-adj-${Date.now()}`,
    projectId,
    sourceType: amount > 0 ? "initial" : "adjustment",
    sourceId: `adj-${Date.now()}`,
    amount,
    description,
    date: new Date().toISOString().split("T")[0],
  });
}

export function getProjectFund(projectId: string) {
  return (
    getFundStore(projectId) || {
      id: `pf-${projectId}`,
      projectId,
      initialBalance: 0,
      currentBalance: 0,
      lastUpdated: new Date().toISOString().split("T")[0],
      transactions: [],
    }
  );
}

export function addFundBalance(
  projectId: string,
  amount: number,
  description: string
) {
  const tx: FundTransaction = {
    id: `pft-${Date.now()}`,
    type: "add",
    category: "general",
    amount,
    description,
    date: new Date().toISOString().split("T")[0],
  };
  const fund = addFundTransactionStore(projectId, tx);
  addTreasuryTxStore({
    id: `tx-fund-add-${Date.now()}`,
    projectId,
    sourceType: "initial",
    sourceId: tx.id,
    amount,
    description: description || "إضافة عهدة",
    date: tx.date,
  });
  return fund;
}

export function recordPurchaseExpense(input: PurchaseRecord) {
  savePurchaseStore(input);

  const fundTx: FundTransaction = {
    id: `pft-p-${input.id}`,
    type: "deduct",
    category: "purchase",
    amount: input.total,
    description: `شراء ${input.name}`,
    date: input.date,
    referenceId: input.id,
  };
  addFundTransactionStore(input.projectId, fundTx);

  // ✅ استدعاء الدالة بشكل صحيح مع تمرير جميع الحقول
  upsertTreasuryBySourceStore(input.projectId, "purchase", input.id, {
    amount: -input.total,
    description: `شراء ${input.name}`,
    date: input.date,
    metadata: { category: "purchase" },
  });

  return input;
}

export function recordMiscExpense(input: MiscellaneousRecord) {
  saveMiscellaneousStore(input);

  const fundTx: FundTransaction = {
    id: `pft-m-${input.id}`,
    type: "deduct",
    category: "miscellaneous",
    amount: input.amount,
    description: input.description,
    date: input.date,
    referenceId: input.id,
  };
  addFundTransactionStore(input.projectId, fundTx);

  // ✅ استدعاء الدالة بشكل صحيح مع تمرير جميع الحقول
  upsertTreasuryBySourceStore(input.projectId, "miscellaneous", input.id, {
    amount: -input.amount,
    description: input.description,
    date: input.date,
    metadata: { category: input.category },
  });

  return input;
}

export function listPurchases(projectId: string) {
  return getPurchasesStore(projectId);
}

export function listMiscellaneous(projectId: string) {
  return getMiscellaneousStore(projectId);
}

export function initProjectFund(projectId: string, initialBalance: number) {
  const existing = getFundStore(projectId);
  if (existing) return existing;

  const fund = saveFundStore({
    id: `pf-${projectId}`,
    projectId,
    initialBalance,
    currentBalance: initialBalance,
    lastUpdated: new Date().toISOString().split("T")[0],
    transactions: [
      {
        id: `pft-init-${projectId}`,
        type: "add",
        category: "general",
        amount: initialBalance,
        description: "عهدة المشروع الابتدائية",
        date: new Date().toISOString().split("T")[0],
      },
    ],
  });

  if (initialBalance > 0) {
    addTreasuryTxStore({
      id: `tx-init-${projectId}`,
      projectId,
      sourceType: "initial",
      sourceId: `init-${projectId}`,
      amount: initialBalance,
      description: "رصيد ابتدائي — عهدة المشروع",
      date: new Date().toISOString().split("T")[0],
    });
  }

  return fund;
}
