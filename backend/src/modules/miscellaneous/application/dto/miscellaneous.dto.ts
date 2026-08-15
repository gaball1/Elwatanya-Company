import { MiscellaneousCategory } from '../../domain/miscellaneous.entity';

export interface MiscellaneousResult {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  category: MiscellaneousCategory;
  date: Date;
  notes: string;
  invoiceFile: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMiscellaneousInput {
  projectId: string;
  description: string;
  amount: number;
  category: MiscellaneousCategory;
  date: Date;
  notes?: string;
  invoiceFile?: string | null;
  createdBy: string;
}

export interface UpdateMiscellaneousInput {
  id: string;
  description?: string;
  amount?: number;
  category?: MiscellaneousCategory;
  date?: Date;
  notes?: string;
  invoiceFile?: string | null;
  createdBy?: string;
}
