export type TreasurySourceType =
  | "extract"
  | "purchase"
  | "miscellaneous"
  | "initial"
  | "adjustment";

export type DeductionType = "manual" | "insurance" | "previous_paid";

export interface ExtractDeduction {
  id: string;
  name: string;
  amount: number;
  percent?: number;
  type: DeductionType;
  readOnly?: boolean;
}

export interface TreasuryTransaction {
  id: string;
  projectId: string;
  sourceType: TreasurySourceType;
  sourceId: string;
  amount: number;
  description: string;
  date: string;
  notes?: string;
  metadata?: {
    buildingId?: string;
    contractorId?: string;
    contractorName?: string;
    extractLabel?: string;
    category?: string;
  };
}

export interface FundTransaction {
  id: string;
  type: "add" | "deduct" | "request";
  category: "purchase" | "miscellaneous" | "general";
  amount: number;
  description: string;
  date: string;
  referenceId?: string;
  status?: "pending" | "approved" | "rejected";
}

export interface ProjectFund {
  id: string;
  projectId: string;
  initialBalance: number;
  currentBalance: number;
  lastUpdated: string;
  transactions: FundTransaction[];
}

export interface PurchaseRecord {
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
}

export interface MiscellaneousRecord {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  createdBy: string;
}
