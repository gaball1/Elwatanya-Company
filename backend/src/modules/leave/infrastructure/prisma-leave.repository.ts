import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Leave } from '../domain/leave.entity';
import { ILeaveRepository } from '../domain/leave.repository';

@Injectable()
export class PrismaLeaveRepository implements ILeaveRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(leave: Leave): Promise<void> {
    const data = {
      employeeId: leave.employeeId,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      daysCount: leave.daysCount,
      reason: leave.reason,
      status: leave.status,
      approvedBy: leave.approvedBy,
      deletedAt: leave.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.leave.upsert({
      where: { id: leave.id.toValue() },
      create: {
        id: leave.id.toValue(),
        ...data,
        createdAt: leave.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Leave | null> {
    const record = await this.prisma.leave.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Leave[]> {
    const records = await this.prisma.leave.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    employeeId: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
    daysCount: number;
    reason: string;
    status: string;
    approvedBy: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Leave {
    return Leave.reconstitute(
      {
        employeeId: record.employeeId,
        leaveType: record.leaveType,
        startDate: record.startDate,
        endDate: record.endDate,
        daysCount: record.daysCount,
        reason: record.reason,
        status: record.status,
        approvedBy: record.approvedBy,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
