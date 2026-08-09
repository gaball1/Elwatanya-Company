import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Leave } from './leave.entity';

export const LEAVE_REPOSITORY = Symbol('LEAVE_REPOSITORY');

export interface ILeaveRepository {
  save(leave: Leave): Promise<void>;
  findById(id: UniqueEntityId): Promise<Leave | null>;
  findAll(): Promise<Leave[]>;
}
