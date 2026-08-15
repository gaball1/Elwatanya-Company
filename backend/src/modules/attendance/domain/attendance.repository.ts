import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Attendance } from './attendance.entity';

export const ATTENDANCE_REPOSITORY = Symbol('ATTENDANCE_REPOSITORY');

export interface IAttendanceRepository {
  save(attendance: Attendance): Promise<void>;
  findById(id: UniqueEntityId): Promise<Attendance | null>;
  findAll(): Promise<Attendance[]>;
  findAllByEmployee(employeeId: string): Promise<Attendance[]>;
  findByEmployeeAndDate(employeeId: string, date: Date): Promise<Attendance | null>;
}
