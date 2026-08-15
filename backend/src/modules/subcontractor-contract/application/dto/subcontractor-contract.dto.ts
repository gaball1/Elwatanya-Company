export interface SubcontractorContractResult {
  id: string;
  contractNumber: string;
  buildingId: string;
  subcontractorId: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  totalValue: number;
  terms: string[] | null;
  notes: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubcontractorContractInput {
  buildingId: string;
  subcontractorId: string;
  title?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  totalValue?: number;
  terms?: string[] | null;
  notes?: string;
  status?: string;
  createdBy?: string;
}

export interface UpdateSubcontractorContractInput {
  id: string;
  title?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  totalValue?: number;
  terms?: string[] | null;
  notes?: string;
  status?: string;
}
