import { Approval } from '@prisma/client';

export const APPROVAL_REPOSITORY = Symbol('APPROVAL_REPOSITORY');

export interface IApprovalRepository {
  findMany(params: { status?: string; entityType?: string; skip?: number; take?: number }): Promise<Approval[]>;
  findById(id: string): Promise<Approval | null>;
  findByEntity(entityType: string, entityId: string): Promise<Approval | null>;
  create(data: { entityType: string; entityId: string; requestedBy: string; comment?: string; status?: string }): Promise<Approval>;
  reset(data: { id: string; requestedBy: string; comment?: string; status?: string }): Promise<Approval>;
  update(id: string, data: { status: string; approvedBy?: string; comment?: string; approvedAt?: Date }): Promise<Approval>;
  count(params: { status?: string; entityType?: string }): Promise<number>;
}
