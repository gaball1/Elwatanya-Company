import { Result } from '@/shared/kernel/result';
import { ILeaveRepository } from '../../domain/leave.repository';
import { CreateLeaveInput, LeaveResult } from '../dto/leave.dto';
import { Leave } from '../../domain/leave.entity';
import { toResult } from './list-leaves.use-case';
import { PrismaService } from '@/prisma/prisma.service';

export class CreateLeaveUseCase {
  constructor(
    private readonly leaves: ILeaveRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateLeaveInput): Promise<Result<LeaveResult>> {
    const result = Leave.create({
      employeeId: input.employeeId,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      daysCount: input.daysCount,
      reason: input.reason,
      status: input.status,
      approvedBy: input.approvedBy,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const leave = result.getValue();
    await this.leaves.save(leave);

    if (leave.status === 'pending') {
      const hrUsers = await this.prisma.user.findMany({
        where: { role: { in: ['CEO', 'TECHNICAL_OFFICE'] } },
      });
      for (const user of hrUsers) {
        await this.prisma.notification.create({
          data: {
            title: 'طلب إجازة جديد',
            titleEn: 'New Leave Request',
            message: `تم تقديم طلب إجازة جديد`,
            messageEn: `A new leave request has been submitted`,
            type: 'info',
            userId: user.id,
            entityType: 'leave',
            entityId: leave.id.toValue(),
            link: `/leaves/${leave.id.toValue()}`,
          },
        });
      }
    }

    return Result.ok(toResult(leave));
  }
}
