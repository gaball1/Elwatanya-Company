export interface ClientStatementResult {
  id: string;
  statementNumber: string;
  projectId: string;
  projectName: string;
  buildingId: string;
  buildingName: string;
  clientId: string;
  clientName: string;
  date: Date;
  status: string;
  totalWorkValue: number;
  totalDeductions: number;
  netPayable: number;
  items: any[];
  deductions: any[];
  signatures: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientStatementInput {
  statementNumber?: string;
  projectId: string;
  projectName?: string;
  buildingId?: string;
  buildingName?: string;
  clientId: string;
  clientName?: string;
  date?: Date;
  status?: string;
  totalWorkValue?: number;
  totalDeductions?: number;
  netPayable?: number;
  items?: any[];
  deductions?: any[];
  signatures?: any[];
}

export interface UpdateClientStatementInput {
  id: string;
  statementNumber?: string;
  projectId?: string;
  projectName?: string;
  buildingId?: string;
  buildingName?: string;
  clientId?: string;
  clientName?: string;
  date?: Date;
  status?: string;
  totalWorkValue?: number;
  totalDeductions?: number;
  netPayable?: number;
  items?: any[];
  deductions?: any[];
  signatures?: any[];
}
