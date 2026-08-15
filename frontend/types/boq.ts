// types/boq.ts

export interface BoqItemBase {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

// ✅ استخدام type بدل interface الفاضية
export type EmployerBoqItem = BoqItemBase;
export type AnalyticalBoqItem = BoqItemBase;

// ✅ المقايسة النهائية مع التحليل والتوزيع
export interface FinalBoqItem extends BoqItemBase {
  remainingQuantity: number;
  isAnalyzed: boolean;
  components: FinalBoqComponent[];
  status: "pending" | "analyzed" | "partial" | "distributed" | "completed";
  itemDistribution?: ComponentDistribution[];
}

// ✅ مكون في التحليل
export interface FinalBoqComponent {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  isDistributed: boolean;
  distribution: ComponentDistribution[];
  remainingQuantity: number;
}

// ✅ توزيع المكون على مقاولين
export interface ComponentDistribution {
  contractorId: string;
  contractorName: string;
  quantity: number;
  percentage: number;
  assignedAt: string;
}

export interface ContractorBoqItem extends BoqItemBase {
  assignedQuantity: number;
  componentId?: string;
  finalItemId?: string;
}

// ... باقي الـ Interfaces

export type ExtractStatus = "running" | "final";
export type ExtractRunningLabel = `running-${number}`;

export interface ExtractItem {
  itemCode: string;
  description: string;
  unit: string;
  contractQuantity: number;
  previous: number;
  current: number;
  total: number;
  executionPercent: number;
  executedQuantity: number;
  unitPrice: number;
  workValue: number;
  /** Id of the exact contractor BOQ item/component this row belongs to (needed for composite items). */
  contractorBoqItemId?: string;
}

export interface ExtractDeductionRow {
  id: string;
  name: string;
  amount: number;
  percent?: number;
  type?: "manual" | "insurance" | "previous_paid";
  readOnly?: boolean;
}

export interface ContractorExtract {
  id: string;
  buildingId: string;
  projectId: string;
  contractorId: string;
  date: string;
  status: ExtractStatus;
  runningNumber?: number;
  label: string;
  insurancePercent: number;
  items: ExtractItem[];
  deductions: ExtractDeductionRow[];
  totalWorkValue: number;
  previousPaid: number;
  otherAmounts?: number;
  otherAmountItems?: { id: string; name: string; amount: number }[];
  totalDeductions: number;
  netPayable: number;
  signatures?: { id: string; name: string; title: string; date: string }[];
}

export interface ContractorPayment {
  id: string;
  buildingId: string;
  contractorId: string;
  date: string;
  amount: number;
  extractId?: string;
  notes?: string;
}

export interface ContractorBoqMeta {
  buildingId: string;
  contractorId: string;
  workType: string;
  createdAt: string;
}
