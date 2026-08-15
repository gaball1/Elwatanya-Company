import { apiClient } from '@/lib/api/apiClient';

export interface ClientStatementItem {
  id?: string;
  itemName?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  previous: number;
  current: number;
  totalDone: number;
  final: number;
  workValue: number;
  deduction: number;
  net: number;
  notes?: string;
}

export interface ClientStatementDeduction {
  id?: string;
  name?: string;
  amount?: number;
  percent?: number;
}

export interface ClientStatementSignature {
  id: string;
  name: string;
  title: string;
  date: string;
}

export interface ClientStatement {
  id: string;
  statementNumber: string;
  projectId: string;
  projectName: string;
  buildingId: string;
  buildingName: string;
  clientId: string;
  clientName: string;
  date: string;
  status: string;
  totalWorkValue: number;
  totalDeductions: number;
  netPayable: number;
  items: ClientStatementItem[];
  deductions: ClientStatementDeduction[];
  signatures: ClientStatementSignature[];
  createdAt: string;
  updatedAt: string;
}

export const clientStatementService = {
  async list(): Promise<ClientStatement[]> {
    const data = await apiClient<{ items: ClientStatement[] }>('/client-statements', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<ClientStatement> {
    const data = await apiClient<{ statement: ClientStatement }>(`/client-statements/${id}`, { method: 'GET' });
    return data.statement;
  },
  async create(body: unknown): Promise<ClientStatement> {
    const data = await apiClient<{ statement: ClientStatement }>('/client-statements', { method: 'POST', body });
    return data.statement;
  },
  async update(id: string, body: unknown): Promise<ClientStatement> {
    const data = await apiClient<{ statement: ClientStatement }>(`/client-statements/${id}`, { method: 'PATCH', body });
    return data.statement;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/client-statements/${id}`, { method: 'DELETE' });
  },
};
