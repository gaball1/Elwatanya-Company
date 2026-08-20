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

  /**
   * Project ids the actor may access, or `null` when the actor has unrestricted
   * access. Authenticated users with no project assignments (global roles like
   * accountant, CEO) are treated as unrestricted.
   */
  getAccessibleProjectIds(actor: OwnershipActor): string[] | null {
    if (this.isSuperAdmin(actor)) return null;
    if (actor && typeof actor === 'object') {
      const ids = this.projectIdsOf(actor);
      if (ids.length === 0) return null;
      return ids;
    }
    return this.projectIdsOf(actor);
  }

  /** True when the actor may access the given project (no exception thrown). */
  canAccessProject(actor: OwnershipActor, targetProjectId: string): boolean {
    const accessible = this.getAccessibleProjectIds(actor);
    if (accessible === null) return true;
    return accessible.includes(targetProjectId);
  }

  async verifyProjectAccess(actor: OwnershipActor, targetProjectId: string): Promise<void> {
    if (this.canAccessProject(actor, targetProjectId)) return;
    throw new ForbiddenException('Access denied to this project');
  }

  async verifyBuildingAccess(actor: OwnershipActor, buildingId: string): Promise<void> {
    const accessible = this.getAccessibleProjectIds(actor);
    if (accessible === null) return;
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { projectId: true },
    });
    if (!building) {
      throw new ForbiddenException('Building not found');
    }
    if (!accessible.includes(building.projectId)) {
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
