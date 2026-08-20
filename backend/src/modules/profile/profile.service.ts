import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto, ChangePasswordDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getSignature(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { signatureUrl: true } });
    if (!user) throw new NotFoundException('User not found');
    return { signatureUrl: user.signatureUrl ?? '' };
  }

  async saveSignature(userId: string, signatureUrl: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id: userId }, data: { signatureUrl } });
    return { signatureUrl };
  }

  async saveAvatar(userId: string, avatarUrl: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    return { avatarUrl };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: {
          include: { role: { select: { id: true, name: true, description: true } } },
        },
        projectAssignments: {
          include: { project: { select: { id: true, name: true, code: true } } },
        },
        employee: {
          select: {
            id: true, fullName: true, code: true, department: { select: { name: true } },
            phone: true, email: true, hireDate: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const assignedRoles = user.roleAssignments.map((ra) => ra.role);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: assignedRoles.length > 0 ? assignedRoles[0].name : user.role,
      status: user.status,
      signatureUrl: user.signatureUrl ?? '',
      avatarUrl: user.avatarUrl ?? '',
      employee: user.employee,
      roles: assignedRoles,
      projects: user.projectAssignments.map((pa) => pa.project),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
      },
    });

    return { id: updated.id, email: updated.email, name: updated.name };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: 'Password changed successfully' };
  }
}
