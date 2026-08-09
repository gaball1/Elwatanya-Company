import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Miscellaneous } from './miscellaneous.entity';
import { Prisma } from '@prisma/client';

export const MISCELLANEOUS_REPOSITORY = Symbol('MISCELLANEOUS_REPOSITORY');

export interface IMiscellaneousRepository {
  save(miscellaneous: Miscellaneous, tx?: Prisma.TransactionClient): Promise<void>;
  findById(id: UniqueEntityId, tx?: Prisma.TransactionClient): Promise<Miscellaneous | null>;
  findAll(tx?: Prisma.TransactionClient): Promise<Miscellaneous[]>;
}
