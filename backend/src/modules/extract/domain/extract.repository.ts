import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Extract } from './extract.entity';

export const EXTRACT_REPOSITORY = Symbol('EXTRACT_REPOSITORY');

export interface ExtractListItem {
  id: string;
  projectId: string;
  projectName: string;
  buildingId: string;
  buildingName: string;
  contractorId: string;
  contractorName: string;
  workType: string;
  sequenceNumber: number;
  runningNumber: number | null;
  status: string;
  label: string | null;
  extractDate: Date;
  insurancePercent: number;
  previousPaid: number;
  otherAmounts: number;
  totalWorkValue: number;
  totalDeductions: number;
  netPayable: number;
  itemCount: number;
  createdAt: Date;
}

export interface IExtractRepository {
  save(extract: Extract, tx?: any): Promise<void>;
  findById(id: UniqueEntityId): Promise<Extract | null>;
  findByContractorBoqId(contractorBoqId: UniqueEntityId): Promise<Extract[]>;
  listAll(projectIds?: string[] | null): Promise<ExtractListItem[]>;
  delete(id: UniqueEntityId): Promise<void>;
}
