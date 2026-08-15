import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * The JWT user carries both the legacy single `projectId` and the richer
 * `projectIds` array plus `roleNames`. Callers may pass either the raw
 * project id string (legacy) or the full user object.
 */
export type OwnershipActor =
  | string
  | null
  | undefined
  | {
      projectId?: string | null;
      projectIds?: string[];
      roleNames?: string[];
    };

@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(actor: OwnershipActor): boolean {
    if (actor && typeof actor === 'object') {
      return Array.isArray(actor.roleNames) && actor.roleNames.includes('SUPER_ADMIN');
    }
    return false;
  }

  private projectIdsOf(actor: OwnershipActor): string[] {
    if (actor && typeof actor === 'object') {
      const ids = actor.projectIds?.length ? actor.projectIds : actor.projectId ? [actor.projectId] : [];
      return ids;
    }
    return actor ? [actor] : [];
  }

  async verifyProjectAccess(actor: OwnershipActor, targetProjectId: string): Promise<void> {
    if (this.isSuperAdmin(actor)) return;
    const ids = this.projectIdsOf(actor);
    // A user with no project assignment has no project to access.
    if (ids.length === 0) {
      throw new ForbiddenException('Access denied to this project');
    }
    if (!ids.includes(targetProjectId)) {
      throw new ForbiddenException('Access denied to this project');
    }
  }

  async verifyBuildingAccess(actor: OwnershipActor, buildingId: string): Promise<void> {
    if (this.isSuperAdmin(actor)) return;
    const ids = this.projectIdsOf(actor);
    if (ids.length === 0) {
      throw new ForbiddenException('Access denied to this project');
    }
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { projectId: true },
    });
    if (!building) {
      throw new ForbiddenException('Building not found');
    }
    if (!ids.includes(building.projectId)) {
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
