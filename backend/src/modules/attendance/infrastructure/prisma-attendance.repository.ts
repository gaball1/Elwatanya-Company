import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Attendance } from '../domain/attendance.entity';
import { IAttendanceRepository } from '../domain/attendance.repository';

@Injectable()
export class PrismaAttendanceRepository implements IAttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(attendance: Attendance): Promise<void> {
    const data = {
      employeeId: attendance.employeeId,
      date: attendance.date,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      status: attendance.status,
      hoursWorked: attendance.hoursWorked,
      latitude: attendance.latitude,
      longitude: attendance.longitude,
      checkInTime: attendance.checkInTime,
      checkInLatitude: attendance.checkInLatitude,
      checkInLongitude: attendance.checkInLongitude,
      checkInAddress: attendance.checkInAddress,
      checkInAccuracy: attendance.checkInAccuracy,
      checkInSelfie: attendance.checkInSelfie,
      checkOutTime: attendance.checkOutTime,
      checkOutLatitude: attendance.checkOutLatitude,
      checkOutLongitude: attendance.checkOutLongitude,
      checkOutAddress: attendance.checkOutAddress,
      checkOutAccuracy: attendance.checkOutAccuracy,
      checkOutSelfie: attendance.checkOutSelfie,
      workedMinutes: attendance.workedMinutes,
      distanceFromSite: attendance.distanceFromSite,
      attendanceStatus: attendance.attendanceStatus,
      deviceInfo: attendance.deviceInfo,
      isSynced: attendance.isSynced,
      projectId: attendance.projectId,
      buildingId: attendance.buildingId,
      notes: attendance.notes,
      deletedAt: attendance.deletedAt,
      updatedAt: new Date(),
    };

    // A soft-deleted attendance still holds the unique (employeeId, date) index,
    // so a fresh insert would violate the constraint. Restore the existing row
    // instead of inserting a new record.
    const softDeleted = await this.prisma.attendance.findFirst({
      where: {
        employeeId: attendance.employeeId,
        date: attendance.date,
        deletedAt: { not: null },
      },
      select: { id: true },
    });
    if (softDeleted) {
      await this.prisma.attendance.update({
        where: { id: softDeleted.id },
        data: { ...data, deletedAt: null },
      });
      attendance.reconcileId(new UniqueEntityId(softDeleted.id));
      return;
    }

    await this.prisma.attendance.upsert({
      where: { id: attendance.id.toValue() },
      create: { id: attendance.id.toValue(), ...data, createdAt: attendance.createdAt },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Attendance | null> {
    const record = await this.prisma.attendance.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Attendance[]> {
    const records = await this.prisma.attendance.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findAllByEmployee(employeeId: string): Promise<Attendance[]> {
    const records = await this.prisma.attendance.findMany({
      where: { employeeId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByEmployeeAndDate(employeeId: string, date: Date): Promise<Attendance | null> {
    const record = await this.prisma.attendance.findFirst({
      where: { employeeId, date, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  private toDomain(record: any): Attendance {
    return Attendance.reconstitute(
      {
        employeeId: record.employeeId ?? '',
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.status,
        hoursWorked: Number(record.hoursWorked),
        latitude: record.latitude ? Number(record.latitude) : null,
        longitude: record.longitude ? Number(record.longitude) : null,
        checkInTime: record.checkInTime,
        checkInLatitude: record.checkInLatitude ? Number(record.checkInLatitude) : null,
        checkInLongitude: record.checkInLongitude ? Number(record.checkInLongitude) : null,
        checkInAddress: record.checkInAddress,
        checkInAccuracy: record.checkInAccuracy,
        checkInSelfie: record.checkInSelfie,
        checkOutTime: record.checkOutTime,
        checkOutLatitude: record.checkOutLatitude ? Number(record.checkOutLatitude) : null,
        checkOutLongitude: record.checkOutLongitude ? Number(record.checkOutLongitude) : null,
        checkOutAddress: record.checkOutAddress,
        checkOutAccuracy: record.checkOutAccuracy,
        checkOutSelfie: record.checkOutSelfie,
        workedMinutes: record.workedMinutes,
        distanceFromSite: record.distanceFromSite,
        attendanceStatus: record.attendanceStatus,
        deviceInfo: record.deviceInfo,
        isSynced: record.isSynced ?? true,
        projectId: record.projectId,
        buildingId: record.buildingId,
        notes: record.notes,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
