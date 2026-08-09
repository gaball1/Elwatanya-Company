import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IHolidayRepository } from '../../domain/holiday.repository';
import { UpdateHolidayInput, HolidayResult } from '../dto/holiday.dto';
import { toResult } from './list-holidays.use-case';

export class UpdateHolidayUseCase {
  constructor(private readonly holidays: IHolidayRepository) {}

  async execute(input: UpdateHolidayInput): Promise<Result<HolidayResult>> {
    const holiday = await this.holidays.findById(new UniqueEntityId(input.id));
    if (!holiday) return Result.fail(new Error('Holiday not found'));

    const updateResult = holiday.update({
      name: input.name,
      date: input.date,
      description: input.description,
      isRecurring: input.isRecurring,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.holidays.save(holiday);
    return Result.ok(toResult(holiday));
  }
}
