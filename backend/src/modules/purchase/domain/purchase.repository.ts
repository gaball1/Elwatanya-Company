import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Purchase } from './purchase.entity';
import { Prisma } from '@prisma/client';

export const PURCHASE_REPOSITORY = Symbol('PURCHASE_REPOSITORY');

export interface IPurchaseRepository {
  save(purchase: Purchase, tx?: Prisma.TransactionClient): Promise<void>;
  findById(id: UniqueEntityId, tx?: Prisma.TransactionClient): Promise<Purchase | null>;
  findByProjectId(projectId: string, tx?: Prisma.TransactionClient): Promise<Purchase[]>;
  findAll(tx?: Prisma.TransactionClient): Promise<Purchase[]>;
}
