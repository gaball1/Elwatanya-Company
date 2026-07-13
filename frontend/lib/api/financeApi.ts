import type { ContractorExtract } from "@/types/boq";
import type {
  FundTransaction,
  MiscellaneousRecord,
  ProjectFund,
  PurchaseRecord,
  TreasuryTransaction,
} from "@/types/finance";

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export const financeApi = {
  listExtracts(buildingId: string, contractorId: string) {
    return request<{ extracts: ContractorExtract[] }>(
      `/api/extracts?buildingId=${buildingId}&contractorId=${contractorId}`
    );
  },

  getExtractMeta(buildingId: string, contractorId: string, runningNumber?: number) {
    const q = new URLSearchParams({
      buildingId,
      contractorId,
      meta: "1",
    });
    if (runningNumber) q.set("runningNumber", String(runningNumber));
    return request<{
      previousPaid: number;
      previousQuantities: Record<string, number>;
      nextRunningNumber: number;
    }>(`/api/extracts?${q}`);
  },

  saveExtract(
    extract: ContractorExtract,
    manualDeductions?: import("@/types/finance").ExtractDeduction[]
  ) {
    return request<{ extract: ContractorExtract }>("/api/extracts", {
      method: "POST",
      body: JSON.stringify({ ...extract, manualDeductions }),
    });
  },

  deleteExtract(
    extractId: string,
    buildingId: string,
    contractorId: string,
    projectId: string
  ) {
    return request<{ success: boolean }>(
      `/api/extracts/${extractId}?buildingId=${buildingId}&contractorId=${contractorId}&projectId=${projectId}`,
      { method: "DELETE" }
    );
  },

  getTreasury(projectId: string) {
    return request<{
      transactions: TreasuryTransaction[];
      totalIncome: number;
      totalExpenses: number;
      currentBalance: number;
    }>(`/api/treasury/${projectId}`);
  },

  addTreasuryBalance(projectId: string, amount: number, description: string) {
    return request<{ transaction: TreasuryTransaction }>(
      `/api/treasury/${projectId}`,
      {
        method: "POST",
        body: JSON.stringify({ amount, description, type: "adjustment" }),
      }
    );
  },

  getFund(projectId: string) {
    return request<{ fund: ProjectFund }>(`/api/fund/${projectId}`);
  },

  addFundBalance(projectId: string, amount: number, description: string) {
    return request<{ fund: ProjectFund }>(`/api/fund/${projectId}`, {
      method: "POST",
      body: JSON.stringify({ amount, description }),
    });
  },

  recordPurchase(purchase: PurchaseRecord) {
    return request<{ purchase: PurchaseRecord; fund: ProjectFund }>(
      `/api/fund/${purchase.projectId}/expense`,
      {
        method: "POST",
        body: JSON.stringify({ type: "purchase", data: purchase }),
      }
    );
  },

  recordMiscellaneous(item: MiscellaneousRecord) {
    return request<{ item: MiscellaneousRecord; fund: ProjectFund }>(
      `/api/fund/${item.projectId}/expense`,
      {
        method: "POST",
        body: JSON.stringify({ type: "miscellaneous", data: item }),
      }
    );
  },

  listPayments(buildingId: string, contractorId: string) {
    return request<{ payments: import("@/types/boq").ContractorPayment[] }>(
      `/api/extracts/payments?buildingId=${buildingId}&contractorId=${contractorId}`
    );
  },
};

export function buildTreasuryHref(
  locale: string,
  projectId: string,
  tx: TreasuryTransaction
): string | null {
  const base = `/${locale}/projects/${projectId}`;
  switch (tx.sourceType) {
    case "extract":
      if (tx.metadata?.buildingId && tx.metadata?.contractorId) {
        return `${base}/buildings/${tx.metadata.buildingId}/subcontractors/${tx.metadata.contractorId}/extracts/${tx.sourceId}`;
      }
      return null;
    case "purchase":
      return `${base}/purchases`;
    case "miscellaneous":
      return `${base}/miscellaneous`;
    default:
      return null;
  }
}
