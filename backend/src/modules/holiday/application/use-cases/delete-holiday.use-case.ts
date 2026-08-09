import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IHolidayRepository } from '../../domain/holiday.repository';

export class DeleteHolidayUseCase {
  constructor(private readonly holidays: IHolidayRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const holiday = await this.holidays.findById(new UniqueEntityId(id));
    if (!holiday) return Result.fail(new Error('Holiday not found'));

    const deleteResult = holiday.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.holidays.save(holiday);
    return Result.ok();
  }
}
