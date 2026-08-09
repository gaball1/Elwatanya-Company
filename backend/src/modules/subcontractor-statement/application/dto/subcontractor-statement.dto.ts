export interface SubcontractorStatementResult {
  id: string; statementNumber: string; projectId: string; projectName: string;
  buildingId: string; buildingName: string; subcontractorId: string; subcontractorName: string;
  workType: string; date: Date; status: string; blockNumber: string; formNumber: string;
  insurancePercent: number; totalWorkValue: number; totalInsurance: number; totalDeductions: number;
  previousPaid: number; netPayable: number; runningNumber: number;
  items: any[]; deductions: any[]; signatures: any[];
  createdAt: Date; updatedAt: Date;
}

export interface CreateSubcontractorStatementInput {
  statementNumber?: string; projectId: string; projectName?: string;
  buildingId?: string; buildingName?: string; subcontractorId: string;
  subcontractorName?: string; workType?: string; date?: Date; status?: string;
  blockNumber?: string; formNumber?: string; insurancePercent?: number;
  totalWorkValue?: number; totalInsurance?: number; totalDeductions?: number;
  previousPaid?: number; netPayable?: number; runningNumber?: number;
  items?: any[]; deductions?: any[]; signatures?: any[];
}

export interface UpdateSubcontractorStatementInput {
  id: string;
  statementNumber?: string; projectId?: string; projectName?: string;
  buildingId?: string; buildingName?: string; subcontractorId?: string; subcontractorName?: string;
  workType?: string; date?: Date; status?: string; blockNumber?: string; formNumber?: string;
  insurancePercent?: number; totalWorkValue?: number; totalInsurance?: number;
  totalDeductions?: number; previousPaid?: number; netPayable?: number; runningNumber?: number;
  items?: any[]; deductions?: any[]; signatures?: any[];
}
