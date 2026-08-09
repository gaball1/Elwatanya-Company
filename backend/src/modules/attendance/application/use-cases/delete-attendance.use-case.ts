import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IAttendanceRepository } from '../../domain/attendance.repository';

export class DeleteAttendanceUseCase {
  constructor(private readonly attendance: IAttendanceRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const entity = await this.attendance.findById(new UniqueEntityId(id));
    if (!entity) return Result.fail(new Error('Attendance record not found'));

    const deleteResult = entity.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.attendance.save(entity);
    return Result.ok();
  }
}
