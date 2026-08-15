export type ProjectStatus = "planning" | "active" | "completed" | "on_hold";

export interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  status: ProjectStatus;
  startDate: string;
  plannedDurationMonths?: number;
  endDate?: string;
  budget?: number;
  createdAt: string;
}

// إضافة نوع للمعاملات
export interface TreasuryTransaction {
  id: string;
  projectId: string;
  type: "initial" | "purchase" | "inventory" | "miscellaneous" | "adjustment";
  description: string;
  amount: number; // سالب = صرف، موجب = إيداع
  date: string;
  category?: string;
  referenceId?: string; // رقم مرجعي للمشتريات أو النثريات
  notes?: string;
}
