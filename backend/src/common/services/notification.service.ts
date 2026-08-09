import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface CreateNotificationInput {
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  entityType?: string;
  entityId?: string;
  link?: string;
  createdBy?: string;
  date?: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  private readonly adminRoleNames = ['SUPER_ADMIN', 'ADMIN', 'GENERAL_MANAGER'];
  private readonly adminUserRoles = ['CEO'];
  private readonly userRoleEnum = ['CEO', 'TECHNICAL_OFFICE', 'ACCOUNTANT', 'SITE_ENGINEER', 'STORE_MANAGER', 'EMPLOYEE'];

  constructor(private readonly prisma: PrismaService) {}

  /** Resolve users that must always be aware of cross-cutting events (admins). */
  private async getAdminUserIds(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        OR: [
          { role: { in: this.adminUserRoles as Array<never> } },
          { roleAssignments: { some: { role: { name: { in: this.adminRoleNames } } } } },
        ],
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  /** Users assigned to a project (direct column or projectAssignments) plus admins. */
  async resolveProjectMemberIds(projectId: string): Promise<string[]> {
    const members = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        OR: [
          { projectId },
          { projectAssignments: { some: { projectId } } },
        ],
      },
      select: { id: true },
    });
    const ids = new Set<string>(members.map((m) => m.id));
    const admins = await this.getAdminUserIds();
    for (const adminId of admins) ids.add(adminId);
    return Array.from(ids);
  }

  /** Users with any of the given roles (enum or role-assignment based). */
  async resolveRoleIds(roles: string[]): Promise<string[]> {
    const enumRoles = roles.filter((r) => this.userRoleEnum.includes(r));
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        OR: [
          ...(enumRoles.length > 0 ? [{ role: { in: enumRoles as never[] } }] : []),
          { roleAssignments: { some: { role: { name: { in: roles } } } } },
        ],
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  /** Users holding a given permission through any role assignment. */
  async resolvePermissionHolderIds(permission: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        roleAssignments: {
          some: { role: { permissions: { some: { permission: { name: permission } } } } },
        },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  /** All active users. */
  async resolveAllActiveIds(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private async persist(userIds: string[], input: CreateNotificationInput): Promise<void> {
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    if (ids.length === 0) return;

    await this.prisma.notification.createMany({
      data: ids.map((id) => ({
        userId: id,
        title: input.title,
        titleEn: input.titleEn,
        message: input.message,
        messageEn: input.messageEn,
        type: input.type ?? 'info',
        entityType: input.entityType,
        entityId: input.entityId,
        link: input.link,
        createdBy: input.createdBy,
        date: input.date ?? new Date(),
      })),
    });
  }

  async create(input: CreateNotificationInput): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          title: input.title,
          titleEn: input.titleEn,
          message: input.message,
          messageEn: input.messageEn,
          type: input.type ?? 'info',
          entityType: input.entityType,
          entityId: input.entityId,
          link: input.link,
          createdBy: input.createdBy,
          date: input.date ?? new Date(),
        },
      });
    } catch (err) {
      this.logger.error(`Failed to create notification: ${(err as Error).message}`);
    }
  }

  async createForUser(userId: string, input: CreateNotificationInput): Promise<void> {
    try {
      await this.persist([userId], input);
    } catch (err) {
      this.logger.error(`Failed to create notification for user ${userId}: ${(err as Error).message}`);
    }
  }

  async createForProjectMembers(projectId: string, input: CreateNotificationInput): Promise<void> {
    try {
      const ids = await this.resolveProjectMemberIds(projectId);
      await this.persist(ids, input);
    } catch (err) {
      this.logger.error(`Failed to create notifications for project members: ${(err as Error).message}`);
    }
  }

  async createForRoles(roles: string[], input: CreateNotificationInput): Promise<void> {
    try {
      const ids = await this.resolveRoleIds(roles);
      await this.persist(ids, input);
    } catch (err) {
      this.logger.error(`Failed to create notifications for roles ${roles.join(',')}: ${(err as Error).message}`);
    }
  }

  /** Notify users holding a given permission through any of their roles. */
  async createForPermissionHolders(permission: string, input: CreateNotificationInput): Promise<void> {
    try {
      const ids = await this.resolvePermissionHolderIds(permission);
      await this.persist(ids, input);
    } catch (err) {
      this.logger.error(`Failed to create notifications for permission holders: ${(err as Error).message}`);
    }
  }

  async createForAllUsers(input: CreateNotificationInput): Promise<void> {
    try {
      const ids = await this.resolveAllActiveIds();
      await this.persist(ids, input);
    } catch (err) {
      this.logger.error(`Failed to create notifications for all users: ${(err as Error).message}`);
    }
  }
}
