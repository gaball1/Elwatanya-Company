import { AttendanceStatusType } from '../../domain/attendance.entity';

export interface AttendanceResult {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAttendanceInput {
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
}

export interface CheckOutInput {
  id: string;
  checkOutTime: Date;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  checkOutAddress?: string | null;
  checkOutAccuracy?: number | null;
  checkOutSelfie?: string | null;
  distanceFromSite?: number | null;
  notes?: string | null;
}

export interface UpdateAttendanceInput {
  id: string;
  employeeId?: string;
  date?: Date;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  hoursWorked?: number;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
}
