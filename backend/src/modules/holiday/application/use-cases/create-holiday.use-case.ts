import { Result } from '@/shared/kernel/result';
import { IHolidayRepository } from '../../domain/holiday.repository';
import { CreateHolidayInput, HolidayResult } from '../dto/holiday.dto';
import { Holiday } from '../../domain/holiday.entity';
import { toResult } from './list-holidays.use-case';

export class CreateHolidayUseCase {
  constructor(private readonly holidays: IHolidayRepository) {}

  async execute(input: CreateHolidayInput): Promise<Result<HolidayResult>> {
    const result = Holiday.create({
      name: input.name,
      date: input.date,
      description: input.description,
      isRecurring: input.isRecurring,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const holiday = result.getValue();
    try {
      await this.holidays.save(holiday);
    } catch (error: any) {
      if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
        return Result.fail(new Error('A holiday with this name and date already exists'));
      }
      return Result.fail(error);
    }
    return Result.ok(toResult(holiday));
  }
}
