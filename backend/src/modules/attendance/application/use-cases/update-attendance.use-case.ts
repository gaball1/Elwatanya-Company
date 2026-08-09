import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IAttendanceRepository } from '../../domain/attendance.repository';
import { UpdateAttendanceInput, AttendanceResult } from '../dto/attendance.dto';
import { toResult } from './list-attendance.use-case';

export class UpdateAttendanceUseCase {
  constructor(private readonly attendance: IAttendanceRepository) {}

  async execute(input: UpdateAttendanceInput): Promise<Result<AttendanceResult>> {
    const entity = await this.attendance.findById(new UniqueEntityId(input.id));
    if (!entity) return Result.fail(new Error('Attendance record not found'));

    const updateResult = entity.update({
      employeeId: input.employeeId,
      date: input.date,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      status: input.status,
      hoursWorked: input.hoursWorked,
      latitude: input.latitude,
      longitude: input.longitude,
      notes: input.notes,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.attendance.save(entity);
    return Result.ok(toResult(entity));
  }
}
