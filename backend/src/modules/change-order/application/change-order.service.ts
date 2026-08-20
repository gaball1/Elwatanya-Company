import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateChangeOrderDto, UpdateChangeOrderDto } from '../dto/change-order.dto';

@Injectable()
export class ChangeOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string) {
    return this.prisma.changeOrder.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { changeNumber: 'desc' },
    });
  }

  async getById(id: string) {
    const order = await this.prisma.changeOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!order) throw new NotFoundException('Change order not found');
    return order;
  }

  async create(input: CreateChangeOrderDto) {
    const maxNumber = await this.prisma.changeOrder.aggregate({
      where: { projectId: input.projectId, deletedAt: null },
      _max: { changeNumber: true },
    });
    const nextNumber = (maxNumber._max.changeNumber ?? 0) + 1;

    const lastApproved = await this.prisma.changeOrder.findFirst({
      where: {
        projectId: input.projectId,
        status: 'approved',
        deletedAt: null,
      },
      orderBy: { changeNumber: 'desc' },
    });
    const originalAmount = lastApproved ? Number(lastApproved.newAmount) : 0;
    const newAmount = originalAmount + input.changeAmount;

    return this.prisma.changeOrder.create({
      data: {
        projectId: input.projectId,
        changeNumber: nextNumber,
        title: input.title,
        description: input.description ?? '',
        reason: input.reason ?? '',
        originalAmount,
        changeAmount: input.changeAmount,
        newAmount,
        status: 'draft',
      },
    });
  }

  async update(id: string, input: UpdateChangeOrderDto) {
    await this.getById(id);

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.reason !== undefined) data.reason = input.reason;
    if (input.status !== undefined) data.status = input.status;

    if (input.changeAmount !== undefined) {
      data.changeAmount = input.changeAmount;
      const current = await this.getById(id);
      data.newAmount = Number(current.originalAmount) + input.changeAmount;
    }

    return this.prisma.changeOrder.update({
      where: { id },
      data,
    });
  }

  async approve(id: string, approvedBy: string) {
    await this.getById(id);
    return this.prisma.changeOrder.update({
      where: { id },
      data: { status: 'approved', approvedBy, approvedAt: new Date() },
    });
  }

  async reject(id: string, rejectionReason?: string) {
    await this.getById(id);
    return this.prisma.changeOrder.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: rejectionReason ?? null,
      },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return this.prisma.changeOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
