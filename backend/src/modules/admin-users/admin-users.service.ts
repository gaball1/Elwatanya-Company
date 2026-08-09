import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto, AssignRolesDto, AssignProjectsDto, ResetPasswordDto, QueryUsersDto } from './dto/admin-users.dto';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async list(query: QueryUsersDto) {
    const where: any = { deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        roleAssignments: {
          include: { role: { select: { id: true, name: true } } },
        },
        projectAssignments: {
          include: { project: { select: { id: true, name: true, code: true } } },
        },
        employee: { select: { id: true, fullName: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      projectId: u.projectId,
      employeeId: u.employeeId,
      employee: u.employee,
      roles: u.roleAssignments.map((ra) => ra.role),
      projects: u.projectAssignments.map((pa) => pa.project),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roleAssignments: {
          include: { role: { select: { id: true, name: true, description: true } } },
        },
        projectAssignments: {
          include: { project: { select: { id: true, name: true, code: true } } },
        },
        employee: { select: { id: true, fullName: true, code: true } },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      projectId: user.projectId,
      employeeId: user.employeeId,
      employee: user.employee,
      roles: user.roleAssignments.map((ra) => ra.role),
      projects: user.projectAssignments.map((pa) => pa.project),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        status: 'ACTIVE',
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    return { id: updated.id, email: updated.email, name: updated.name, status: updated.status };
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async activate(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    return { success: true, message: 'User activated' };
  }

  async disable(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { status: 'DISABLED' },
    });

    return { success: true, message: 'User disabled' };
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: 'Password reset successfully' };
  }

  async assignRoles(id: string, dto: AssignRolesDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Remove existing role assignments
    await this.prisma.userRoleAssignment.deleteMany({ where: { userId: id } });

    // Add new role assignments
    if (dto.roleIds.length > 0) {
      await this.prisma.userRoleAssignment.createMany({
        data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }

    return { success: true, message: 'Roles assigned' };
  }

  async assignProjects(id: string, dto: AssignProjectsDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Remove existing project assignments
    await this.prisma.userProjectAssignment.deleteMany({ where: { userId: id } });

    // Add new project assignments
    if (dto.projectIds.length > 0) {
      await this.prisma.userProjectAssignment.createMany({
        data: dto.projectIds.map((projectId) => ({ userId: id, projectId })),
      });
    }

    return { success: true, message: 'Projects assigned' };
  }
}
