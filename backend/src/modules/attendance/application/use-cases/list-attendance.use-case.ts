import { Result } from '@/shared/kernel/result';
import { Attendance } from '../../domain/attendance.entity';
import { AttendanceResult } from '../dto/attendance.dto';
import { IAttendanceRepository } from '../../domain/attendance.repository';

export function toResult(c: Attendance): AttendanceResult {
  return {
    id: c.id.toValue(),
    employeeId: c.employeeId,
    date: c.date,
    checkIn: c.checkIn,
    checkOut: c.checkOut,
    status: c.status,
    hoursWorked: Number(c.hoursWorked),
    latitude: c.latitude,
    longitude: c.longitude,
    checkInTime: c.checkInTime,
    checkInLatitude: c.checkInLatitude,
    checkInLongitude: c.checkInLongitude,
    checkInAddress: c.checkInAddress,
    checkInAccuracy: c.checkInAccuracy,
    checkInSelfie: c.checkInSelfie,
    checkOutTime: c.checkOutTime,
    checkOutLatitude: c.checkOutLatitude,
    checkOutLongitude: c.checkOutLongitude,
    checkOutAddress: c.checkOutAddress,
    checkOutAccuracy: c.checkOutAccuracy,
    checkOutSelfie: c.checkOutSelfie,
    workedMinutes: c.workedMinutes,
    distanceFromSite: c.distanceFromSite,
    attendanceStatus: c.attendanceStatus,
    deviceInfo: c.deviceInfo,
    isSynced: c.isSynced,
    projectId: c.projectId,
    buildingId: c.buildingId,
    notes: c.notes,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export class ListAttendanceUseCase {
  constructor(private readonly attendance: IAttendanceRepository) {}

  async execute(): Promise<Result<AttendanceResult[]>> {
    const list = await this.attendance.findAll();
    return Result.ok(list.map(toResult));
  }
}
