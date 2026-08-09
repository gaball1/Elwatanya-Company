import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Holiday } from './holiday.entity';

export const HOLIDAY_REPOSITORY = Symbol('HOLIDAY_REPOSITORY');

export interface IHolidayRepository {
  save(holiday: Holiday): Promise<void>;
  findById(id: UniqueEntityId): Promise<Holiday | null>;
  findAll(): Promise<Holiday[]>;
}
