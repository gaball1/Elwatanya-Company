import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class BuildingSubcontractorService {
  constructor(private readonly prisma: PrismaService) {}

  async listByBuilding(buildingId: string) {
    const building = await this.prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) throw new NotFoundException('Building not found');

    return this.prisma.buildingSubcontractor.findMany({
      where: { buildingId, status: 'active' },
      include: {
        subcontractor: {
          select: { id: true, name: true, workType: true, phone: true, email: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async assign(buildingId: string, subcontractorId: string, workType?: string, agreedPrice?: number) {
    const building = await this.prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) throw new NotFoundException('Building not found');

    const sub = await this.prisma.subcontractor.findFirst({ where: { id: subcontractorId, deletedAt: null } });
    if (!sub) throw new NotFoundException('Subcontractor not found');

    const existing = await this.prisma.buildingSubcontractor.findUnique({
      where: { buildingId_subcontractorId: { buildingId, subcontractorId } },
    });
    if (existing) {
      if (existing.status === 'active') throw new ConflictException('Subcontractor already assigned to this building');
      await this.prisma.buildingSubcontractor.update({
        where: { buildingId_subcontractorId: { buildingId, subcontractorId } },
        data: { status: 'active', workType: workType ?? existing.workType, agreedPrice, updatedAt: new Date() },
      });
      return this.prisma.buildingSubcontractor.findUnique({
        where: { buildingId_subcontractorId: { buildingId, subcontractorId } },
        include: { subcontractor: { select: { id: true, name: true, workType: true, phone: true, email: true } } },
      });
    }

    return this.prisma.buildingSubcontractor.create({
      data: { buildingId, subcontractorId, workType: workType ?? sub.workType, agreedPrice },
      include: { subcontractor: { select: { id: true, name: true, workType: true, phone: true, email: true } } },
    });
  }

  async remove(buildingId: string, subcontractorId: string) {
    const existing = await this.prisma.buildingSubcontractor.findUnique({
      where: { buildingId_subcontractorId: { buildingId, subcontractorId } },
    });
    if (!existing) throw new NotFoundException('Assignment not found');

    await this.prisma.buildingSubcontractor.update({
      where: { buildingId_subcontractorId: { buildingId, subcontractorId } },
      data: { status: 'inactive', updatedAt: new Date() },
    });
  }
}
