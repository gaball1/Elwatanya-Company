import { Approval } from '@prisma/client';

export const APPROVAL_REPOSITORY = Symbol('APPROVAL_REPOSITORY');

export interface ApprovalListItem extends Approval {
  /** Display name of the user who submitted the request. */
  requestedByName?: string;
  /** Display name of the user who approved/rejected/cancelled the request. */
  approvedByName?: string;
}

export interface IApprovalRepository {
  findMany(params: { status?: string; entityType?: string; requestedBy?: string; skip?: number; take?: number }): Promise<ApprovalListItem[]>;
  findById(id: string): Promise<Approval | null>;
  findByIdWithNames(id: string): Promise<ApprovalListItem | null>;
  findByEntity(entityType: string, entityId: string): Promise<Approval | null>;
  create(data: { entityType: string; entityId: string; requestedBy: string; comment?: string; status?: string }): Promise<Approval>;
  reset(data: { id: string; requestedBy: string; comment?: string; status?: string }): Promise<Approval>;
  update(id: string, data: { status: string; approvedBy?: string; comment?: string; approvedAt?: Date }): Promise<Approval>;
  /** Atomically moves an approval from one status to another; returns null when the row is not in fromStatus. */
  transition(id: string, fromStatus: string, toStatus: string, data: { approvedBy?: string; comment?: string; approvedAt?: Date }): Promise<Approval | null>;
  count(params: { status?: string; entityType?: string; requestedBy?: string }): Promise<number>;
}
