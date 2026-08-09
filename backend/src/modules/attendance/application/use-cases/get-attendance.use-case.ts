import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Result } from '@/shared/kernel/result';
import { AttendanceResult } from '../dto/attendance.dto';
import { toResult } from './list-attendance.use-case';

export class GetAttendanceUseCase {
  constructor(private readonly attendance: import('../../domain/attendance.repository').IAttendanceRepository) {}

  async execute(id: string): Promise<Result<AttendanceResult | null>> {
    const record = await this.attendance.findById(new UniqueEntityId(id));
    return Result.ok(record ? toResult(record) : null);
  }
}
