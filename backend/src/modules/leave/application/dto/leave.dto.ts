export interface LeaveResult {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  daysCount: number;
  reason: string;
  status: string;
  approvedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveInput {
  employeeId: string;
  leaveType?: string;
  startDate: Date;
  endDate: Date;
  daysCount?: number;
  reason?: string;
  status?: string;
  approvedBy?: string;
}

export interface UpdateLeaveInput {
  id: string;
  employeeId?: string;
  leaveType?: string;
  startDate?: Date;
  endDate?: Date;
  daysCount?: number;
  reason?: string;
  status?: string;
  approvedBy?: string;
}
