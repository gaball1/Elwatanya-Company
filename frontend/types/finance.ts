export type TreasurySourceType =
  | "extract"
  | "purchase"
  | "miscellaneous"
  | "income"
  | "initial"
  | "adjustment"
  | "payment";

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
  status?: "pending" | "approved" | "rejected";
  notes?: string;
  previousBalance?: number;
  currentBalance?: number;
  metadata?: {
    buildingId?: string;
    contractorId?: string;
    contractorName?: string;
    extractLabel?: string;
    category?: string;
    source?: string;
    paymentId?: string;
  };
}

export interface FundTransaction {
  id: string;
  type: "add" | "deduct" | "request" | "transfer";
  category: "purchase" | "miscellaneous" | "general" | "petty_cash" | "extract";
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
  pettyCashBalance: number;
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
