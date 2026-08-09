export interface SubcontractorResult {
  id: string;
  name: string;
  workType: string;
  marginType: string;
  marginValue: number;
  phone: string;
  email: string;
  address: string;
  joinDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubcontractorInput {
  name: string;
  workType?: string;
  marginType?: string;
  marginValue?: number;
  phone?: string;
  email?: string;
  address?: string;
  joinDate?: Date | null;
  status?: string;
}

export interface UpdateSubcontractorInput {
  id: string;
  name?: string;
  workType?: string;
  marginType?: string;
  marginValue?: number;
  phone?: string;
  email?: string;
  address?: string;
  joinDate?: Date | null;
  status?: string;
}
