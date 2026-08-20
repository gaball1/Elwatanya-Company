import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Purchase, PurchaseStatus } from './purchase.entity';
import { Prisma } from '@prisma/client';

export const PURCHASE_REPOSITORY = Symbol('PURCHASE_REPOSITORY');

export interface IPurchaseRepository {
  save(purchase: Purchase, tx?: Prisma.TransactionClient): Promise<void>;
  findById(id: UniqueEntityId, tx?: Prisma.TransactionClient): Promise<Purchase | null>;
  findByProjectId(projectId: string, tx?: Prisma.TransactionClient): Promise<Purchase[]>;
  findByProjectIds(projectIds: string[], status?: string, tx?: Prisma.TransactionClient): Promise<Purchase[]>;
  findByStatus(status: string, projectId?: string, tx?: Prisma.TransactionClient): Promise<Purchase[]>;
  findAll(tx?: Prisma.TransactionClient): Promise<Purchase[]>;
  /** Atomically moves a purchase from one of the given statuses to the target; returns false when the row is not in any of them. */
  transition(
    id: string,
    fromStatuses: PurchaseStatus[],
    toStatus: PurchaseStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean>;
}
