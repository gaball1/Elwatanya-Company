import { apiClient } from '@/lib/api/apiClient';

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
  items: any[];
  deductions: any[];
  signatures: any[];
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
  async create(body: any): Promise<ClientStatement> {
    const data = await apiClient<{ statement: ClientStatement }>('/client-statements', { method: 'POST', body });
    return data.statement;
  },
  async update(id: string, body: any): Promise<ClientStatement> {
    const data = await apiClient<{ statement: ClientStatement }>(`/client-statements/${id}`, { method: 'PATCH', body });
    return data.statement;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/client-statements/${id}`, { method: 'DELETE' });
  },
};
