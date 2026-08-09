import { Result } from '@/shared/kernel/result';
import { Leave } from '../../domain/leave.entity';
import { LeaveResult } from '../dto/leave.dto';

export function toResult(c: Leave): LeaveResult {
  return {
    id: c.id.toValue(),
    employeeId: c.employeeId,
    leaveType: c.leaveType,
    startDate: c.startDate,
    endDate: c.endDate,
    daysCount: c.daysCount,
    reason: c.reason,
    status: c.status,
    approvedBy: c.approvedBy,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export class ListLeavesUseCase {
  constructor(private readonly leaves: import('../../domain/leave.repository').ILeaveRepository) {}

  async execute(): Promise<Result<LeaveResult[]>> {
    const list = await this.leaves.findAll();
    return Result.ok(list.map(toResult));
  }
}
