import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  private isCrossProjectAdmin(userProjectId: string | null | undefined): boolean {
    return !userProjectId;
  }

  async verifyProjectAccess(userProjectId: string | null | undefined, targetProjectId: string): Promise<void> {
    if (this.isCrossProjectAdmin(userProjectId)) return;
    if (userProjectId !== targetProjectId) {
      throw new ForbiddenException('Access denied to this project');
    }
  }

  async verifyBuildingAccess(userProjectId: string | null | undefined, buildingId: string): Promise<void> {
    if (this.isCrossProjectAdmin(userProjectId)) return;
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { projectId: true },
    });
    if (!building) {
      throw new ForbiddenException('Building not found');
    }
    if (building.projectId !== userProjectId) {
      throw new ForbiddenException('Access denied to this building');
    }
  }

  async verifyBuildingBelongsToProject(projectId: string, buildingId: string): Promise<void> {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { projectId: true },
    });
    if (!building || building.projectId !== projectId) {
      throw new ForbiddenException('Building does not belong to this project');
    }
  }
}
