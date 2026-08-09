import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ILeaveRepository } from '../../domain/leave.repository';
import { UpdateLeaveInput, LeaveResult } from '../dto/leave.dto';
import { toResult } from './list-leaves.use-case';

export class UpdateLeaveUseCase {
  constructor(private readonly leaves: ILeaveRepository) {}

  async execute(input: UpdateLeaveInput): Promise<Result<LeaveResult>> {
    const leave = await this.leaves.findById(new UniqueEntityId(input.id));
    if (!leave) return Result.fail(new Error('Leave not found'));

    const updateResult = leave.update({
      employeeId: input.employeeId,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      daysCount: input.daysCount,
      reason: input.reason,
      status: input.status,
      approvedBy: input.approvedBy,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.leaves.save(leave);
    return Result.ok(toResult(leave));
  }
}
