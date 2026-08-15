import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export type AttendanceStatusType = 'pending' | 'checkedIn' | 'checkedOut' | 'late' | 'absent';

export interface AttendanceProps {
  employeeId: string;
  date: Date;

  // Legacy
  checkIn: string;
  checkOut: string;
  status: string;
  hoursWorked: number;
  latitude: number | null;
  longitude: number | null;

  // Check-in
  checkInTime: Date | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkInAddress: string | null;
  checkInAccuracy: number | null;
  checkInSelfie: string | null;

  // Check-out
  checkOutTime: Date | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAddress: string | null;
  checkOutAccuracy: number | null;
  checkOutSelfie: string | null;

  // Summary
  workedMinutes: number | null;
  distanceFromSite: number | null;
  attendanceStatus: AttendanceStatusType;

  // Device & sync
  deviceInfo: string | null;
  isSynced: boolean;

  // Assignment
  projectId: string | null;
  buildingId: string | null;

  // Misc
  notes: string;
  deletedAt: Date | null;
}

export class Attendance extends AggregateRoot {
  private props: AttendanceProps;

  private constructor(props: AttendanceProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get employeeId(): string { return this.props.employeeId; }
  get date(): Date { return this.props.date; }
  get checkIn(): string { return this.props.checkIn; }
  get checkOut(): string { return this.props.checkOut; }
  get status(): string { return this.props.status; }
  get hoursWorked(): number { return this.props.hoursWorked; }
  get latitude(): number | null { return this.props.latitude; }
  get longitude(): number | null { return this.props.longitude; }
  get checkInTime(): Date | null { return this.props.checkInTime; }
  get checkInLatitude(): number | null { return this.props.checkInLatitude; }
  get checkInLongitude(): number | null { return this.props.checkInLongitude; }
  get checkInAddress(): string | null { return this.props.checkInAddress; }
  get checkInAccuracy(): number | null { return this.props.checkInAccuracy; }
  get checkInSelfie(): string | null { return this.props.checkInSelfie; }
  get checkOutTime(): Date | null { return this.props.checkOutTime; }
  get checkOutLatitude(): number | null { return this.props.checkOutLatitude; }
  get checkOutLongitude(): number | null { return this.props.checkOutLongitude; }
  get checkOutAddress(): string | null { return this.props.checkOutAddress; }
  get checkOutAccuracy(): number | null { return this.props.checkOutAccuracy; }
  get checkOutSelfie(): string | null { return this.props.checkOutSelfie; }
  get workedMinutes(): number | null { return this.props.workedMinutes; }
  get distanceFromSite(): number | null { return this.props.distanceFromSite; }
  get attendanceStatus(): AttendanceStatusType { return this.props.attendanceStatus; }
  get deviceInfo(): string | null { return this.props.deviceInfo; }
  get isSynced(): boolean { return this.props.isSynced; }
  get projectId(): string | null { return this.props.projectId; }
  get buildingId(): string | null { return this.props.buildingId; }
  get notes(): string { return this.props.notes; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    employeeId: string;
    date: Date;
    checkInTime: Date;
    checkInLatitude?: number | null;
    checkInLongitude?: number | null;
    checkInAddress?: string | null;
    checkInAccuracy?: number | null;
    checkInSelfie?: string | null;
    deviceInfo?: string | null;
    distanceFromSite?: number | null;
    projectId?: string | null;
    buildingId?: string | null;
    notes?: string | null;
  }): Result<Attendance> {
    const guard1 = Guard.againstNullOrUndefined(input.employeeId, 'employeeId');
    const guard2 = Guard.againstNullOrUndefined(input.checkInTime, 'checkInTime');
    const combined = Guard.combine(guard1, guard2);
    if (combined.isFailure) return Result.fail(combined.error as Error);

    if (!input.employeeId.trim()) return Result.fail(new Error('employeeId cannot be empty'));
    if (!input.date) return Result.fail(new Error('date is required'));

    const checkIn = input.checkInTime;
    const hh = String(checkIn.getHours()).padStart(2, '0');
    const mm = String(checkIn.getMinutes()).padStart(2, '0');

    return Result.ok(
      new Attendance({
        employeeId: input.employeeId.trim(),
        date: input.date,
        checkIn: `${hh}:${mm}`,
        checkOut: '',
        status: 'present',
        hoursWorked: 0,
        latitude: input.checkInLatitude ?? null,
        longitude: input.checkInLongitude ?? null,
        checkInTime: input.checkInTime,
        checkInLatitude: input.checkInLatitude ?? null,
        checkInLongitude: input.checkInLongitude ?? null,
        checkInAddress: input.checkInAddress ?? null,
        checkInAccuracy: input.checkInAccuracy ?? null,
        checkInSelfie: input.checkInSelfie ?? null,
        checkOutTime: null,
        checkOutLatitude: null,
        checkOutLongitude: null,
        checkOutAddress: null,
        checkOutAccuracy: null,
        checkOutSelfie: null,
        workedMinutes: null,
        distanceFromSite: input.distanceFromSite ?? null,
        attendanceStatus: 'checkedIn',
        deviceInfo: input.deviceInfo ?? null,
        isSynced: true,
        projectId: input.projectId ?? null,
        buildingId: input.buildingId ?? null,
        notes: input.notes ?? '',
        deletedAt: null,
      }),
    );
  }

  public static calculateStatus(
    checkInTime: Date | null,
    shift?: { startTime: string; gracePeriod: number; lateThreshold: number },
  ): string {
    if (!checkInTime) return 'absent';

    if (!shift) return 'present';

    const [hours, minutes] = shift.startTime.split(':').map(Number);
    const shiftStart = new Date(checkInTime);
    shiftStart.setHours(hours, minutes, 0, 0);

    const diffMs = checkInTime.getTime() - shiftStart.getTime();
    const diffMin = diffMs / 60000;

    if (diffMin <= shift.gracePeriod) return 'present';

    return 'late';
  }

  public static reconstitute(props: AttendanceProps, id: UniqueEntityId, createdAt: Date, updatedAt: Date): Attendance {
    return new Attendance(props, id, createdAt, updatedAt);
  }

  public reconcileId(id: UniqueEntityId): void {
    this.changeId(id);
  }

  public doCheckOut(input: {
    checkOutTime: Date;
    checkOutLatitude?: number | null;
    checkOutLongitude?: number | null;
    checkOutAddress?: string | null;
    checkOutAccuracy?: number | null;
    checkOutSelfie?: string | null;
    distanceFromSite?: number | null;
    notes?: string | null;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot check out a deleted record'));
    if (this.props.attendanceStatus !== 'checkedIn') return Result.fail(new Error('Employee has not checked in'));
    if (this.props.checkOutTime) return Result.fail(new Error('Already checked out today'));

    if (input.checkOutTime <= this.props.checkInTime!) {
      return Result.fail(new Error('Check-out time must be after check-in time'));
    }

    const diffMs = input.checkOutTime.getTime() - this.props.checkInTime!.getTime();
    const workedMin = Math.round(diffMs / 60000);

    this.props.checkOutTime = input.checkOutTime;
    this.props.checkOutLatitude = input.checkOutLatitude ?? null;
    this.props.checkOutLongitude = input.checkOutLongitude ?? null;
    this.props.checkOutAddress = input.checkOutAddress ?? null;
    this.props.checkOutAccuracy = input.checkOutAccuracy ?? null;
    this.props.checkOutSelfie = input.checkOutSelfie ?? null;
    this.props.workedMinutes = workedMin;
    this.props.distanceFromSite = input.distanceFromSite ?? null;
    this.props.attendanceStatus = 'checkedOut';

    const hh = String(input.checkOutTime.getHours()).padStart(2, '0');
    const mm = String(input.checkOutTime.getMinutes()).padStart(2, '0');
    this.props.checkOut = `${hh}:${mm}`;
    this.props.hoursWorked = Math.round((workedMin / 60) * 100) / 100;
    this.props.latitude = input.checkOutLatitude ?? this.props.latitude;
    this.props.longitude = input.checkOutLongitude ?? this.props.longitude;
    this.props.status = 'present';
    if (input.notes !== undefined && input.notes !== null) this.props.notes = input.notes;

    return Result.ok();
  }

  public update(fields: {
    employeeId?: string;
    date?: Date;
    checkIn?: string;
    checkOut?: string;
    status?: string;
    hoursWorked?: number;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted attendance record'));
    if (fields.employeeId !== undefined) {
      const trimmed = fields.employeeId.trim();
      if (trimmed.length === 0) return Result.fail(new Error('employeeId cannot be empty'));
      this.props.employeeId = trimmed;
    }
    if (fields.date !== undefined) this.props.date = fields.date;
    if (fields.checkIn !== undefined) this.props.checkIn = fields.checkIn;
    if (fields.checkOut !== undefined) this.props.checkOut = fields.checkOut;
    if (fields.status !== undefined) this.props.status = fields.status;
    if (fields.hoursWorked !== undefined) this.props.hoursWorked = fields.hoursWorked;
    if (fields.latitude !== undefined) this.props.latitude = fields.latitude;
    if (fields.longitude !== undefined) this.props.longitude = fields.longitude;
    if (fields.notes !== undefined) this.props.notes = fields.notes;
    const checkIn = fields.checkIn ?? this.props.checkIn;
    const checkOut = fields.checkOut ?? this.props.checkOut;
    if (checkIn && checkOut && checkOut <= checkIn) {
      return Result.fail(new Error('Check-out time must be after check-in time'));
    }
    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Attendance record is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
