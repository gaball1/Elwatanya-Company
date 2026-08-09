import { Result } from '@/shared/kernel/result';
import { Holiday } from '../../domain/holiday.entity';
import { HolidayResult } from '../dto/holiday.dto';

export function toResult(c: Holiday): HolidayResult {
  return {
    id: c.id.toValue(),
    name: c.name,
    date: c.date,
    description: c.description,
    isRecurring: c.isRecurring,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export class ListHolidaysUseCase {
  constructor(private readonly holidays: import('../../domain/holiday.repository').IHolidayRepository) {}

  async execute(): Promise<Result<HolidayResult[]>> {
    const list = await this.holidays.findAll();
    return Result.ok(list.map(toResult));
  }
}
