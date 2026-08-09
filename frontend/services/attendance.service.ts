import { apiClient } from '@/lib/api/apiClient';

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  hoursWorked: number;
  latitude: number | null;
  longitude: number | null;

  checkInTime: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkInAddress: string | null;
  checkInAccuracy: number | null;
  checkInSelfie: string | null;

  checkOutTime: string | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAddress: string | null;
  checkOutAccuracy: number | null;
  checkOutSelfie: string | null;

  workedMinutes: number | null;
  distanceFromSite: number | null;
  attendanceStatus: 'pending' | 'checkedIn' | 'checkedOut' | 'late' | 'absent';

  deviceInfo: string | null;
  isSynced: boolean;
  projectId: string | null;
  buildingId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInData {
  employeeId: string;
  date: string;
  checkInTime: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkInAddress?: string;
  checkInAccuracy?: number;
  checkInSelfie?: string;
  deviceInfo?: string;
  distanceFromSite?: number;
  projectId?: string;
  buildingId?: string;
  notes?: string;
}

export interface CheckOutData {
  checkOutTime: string;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  checkOutAddress?: string;
  checkOutAccuracy?: number;
  checkOutSelfie?: string;
  distanceFromSite?: number;
  notes?: string;
}

export interface OverrideRequestData {
  attendanceId?: string;
  requestedBy: string;
  reason: string;
  type?: 'check_in' | 'check_out';
  distance?: number;
  snapshot?: CheckInData | CheckOutData;
}

export interface AttendanceOverride {
  id: string;
  attendanceId: string | null;
  requestedBy: string;
  approvedBy: string | null;
  reason: string;
  comment: string | null;
  status: 'pending' | 'approved' | 'rejected';
  type: 'check_in' | 'check_out';
  distance: number | null;
  employeeId: string | null;
  date: string | null;
  createdAt: string;
  payload?: {
    checkInLatitude?: number | null;
    checkInLongitude?: number | null;
    checkInAddress?: string | null;
    checkInAccuracy?: number | null;
    checkInSelfie?: string | null;
    checkOutLatitude?: number | null;
    checkOutLongitude?: number | null;
    checkOutAddress?: string | null;
    checkOutAccuracy?: number | null;
    checkOutSelfie?: string | null;
    distanceFromSite?: number | null;
    deviceInfo?: string | null;
    notes?: string | null;
  };
}

export interface AttendanceActionResult {
  record?: Attendance;
  requiresApproval?: boolean;
  override?: AttendanceOverride;
}

export const attendanceService = {
  async list(): Promise<Attendance[]> {
    const data = await apiClient<{ items: Attendance[] }>('/attendance', { method: 'GET' });
    return data.items;
  },
  async get(id: string): Promise<Attendance> {
    const data = await apiClient<{ record: Attendance }>(`/attendance/${id}`, { method: 'GET' });
    return data.record;
  },
  async checkIn(body: CheckInData, opts?: { skipUnwrap?: boolean }): Promise<AttendanceActionResult> {
    const data = await apiClient<AttendanceActionResult>('/attendance/check-in', { method: 'POST', body });
    return data;
  },
  async checkOut(id: string, body: CheckOutData): Promise<AttendanceActionResult> {
    const data = await apiClient<AttendanceActionResult>(`/attendance/${id}/check-out`, { method: 'POST', body });
    return data;
  },
  async remove(id: string): Promise<void> {
    await apiClient(`/attendance/${id}`, { method: 'DELETE' });
  },
  async requestOverride(body: OverrideRequestData): Promise<AttendanceOverride> {
    const data = await apiClient<{ override: AttendanceOverride }>('/attendance-override', { method: 'POST', body });
    return data.override;
  },
  async listOverrides(status?: string): Promise<AttendanceOverride[]> {
    const query = status ? `?status=${status}` : '';
    const data = await apiClient<{ overrides: AttendanceOverride[] }>(`/attendance-override${query}`, { method: 'GET' });
    return data.overrides;
  },
  async approveOverride(id: string, comment: string): Promise<AttendanceOverride> {
    const data = await apiClient<{ override: AttendanceOverride }>(`/attendance-override/${id}/approve`, { method: 'PATCH', body: { comment } });
    return data.override;
  },
  async rejectOverride(id: string, comment: string): Promise<AttendanceOverride> {
    const data = await apiClient<{ override: AttendanceOverride }>(`/attendance-override/${id}/reject`, { method: 'PATCH', body: { comment } });
    return data.override;
  },
};
