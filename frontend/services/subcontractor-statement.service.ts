import { apiClient } from '@/lib/api/apiClient';

export interface SubcontractorStatementItem {
  id?: string;
  model?: string;
  itemName?: string;
  unit?: string;
  previous?: number;
  current?: number;
  executionPercent?: number;
  count?: number;
  quantity?: number;
  price?: number;
  totalAmount?: number;
  insuranceAmount?: number;
  netAmount?: number;
}

export interface SubcontractorStatementDeduction {
  id?: string;
  name?: string;
  amount?: number;
  percent?: number;
}

export interface SubcontractorStatementSignature {
  id: string;
  name: string;
  title: string;
  date: string;
}

export interface SubcontractorStatement {
  id: string;
  statementNumber: string;
  projectId: string;
  projectName: string;
  buildingId: string;
  buildingName: string;
  subcontractorId: string;
  subcontractorName: string;
  workType: string;
  date: string;
  status: string;
  blockNumber: string;
  formNumber: string;
  insurancePercent: number;
  totalWorkValue: number;
  totalInsurance: number;
  totalDeductions: number;
  previousPaid: number;
  netPayable: number;
  runningNumber: number;
  items: SubcontractorStatementItem[];
  deductions: SubcontractorStatementDeduction[];
  signatures: SubcontractorStatementSignature[];
  createdAt: string;
  updatedAt: string;
}

export const subcontractorStatementService = {
  async list(): Promise<SubcontractorStatement[]> {
    const data = await apiClient<{ items: SubcontractorStatement[] }>('/subcontractor-statements', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<SubcontractorStatement> {
    const data = await apiClient<{ statement: SubcontractorStatement }>(`/subcontractor-statements/${id}`, { method: 'GET' });
    return data.statement;
  },
  async create(body: unknown): Promise<SubcontractorStatement> {
    const data = await apiClient<{ statement: SubcontractorStatement }>('/subcontractor-statements', { method: 'POST', body });
    return data.statement;
  },
  async update(id: string, body: unknown): Promise<SubcontractorStatement> {
    const data = await apiClient<{ statement: SubcontractorStatement }>(`/subcontractor-statements/${id}`, { method: 'PATCH', body });
    return data.statement;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/subcontractor-statements/${id}`, { method: 'DELETE' });
  },
};
