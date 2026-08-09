import { FundTransactionType, FundTransactionCategory, FundTransactionStatus } from '../../domain/fund-transaction.entity';

export interface FundTransactionResult {
  id: string;
  fundId: string;
  type: FundTransactionType;
  category: FundTransactionCategory;
  amount: number;
  description: string;
  date: Date;
  status: FundTransactionStatus;
  referenceId: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFundTransactionInput {
  fundId: string;
  type: FundTransactionType;
  amount: number;
  category?: FundTransactionCategory;
  description?: string;
  date?: Date;
  status?: FundTransactionStatus;
  referenceId?: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateFundTransactionInput {
  id: string;
  fundId?: string;
  type?: FundTransactionType;
  category?: FundTransactionCategory;
  amount?: number;
  description?: string;
  date?: Date;
  status?: FundTransactionStatus;
  referenceId?: string;
  notes?: string;
  createdBy?: string;
}
