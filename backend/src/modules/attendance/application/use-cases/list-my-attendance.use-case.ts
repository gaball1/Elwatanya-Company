import { Result } from '@/shared/kernel/result';
import { AttendanceResult } from '../dto/attendance.dto';
import { IAttendanceRepository } from '../../domain/attendance.repository';
import { toResult } from './list-attendance.use-case';

export class ListMyAttendanceUseCase {
  constructor(private readonly attendance: IAttendanceRepository) {}

  /** Returns only the attendance records of the given employee. */
  async execute(employeeId: string): Promise<Result<AttendanceResult[]>> {
    const list = await this.attendance.findAllByEmployee(employeeId);
    return Result.ok(list.map(toResult));
  }
}
