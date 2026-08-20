import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { UserRole } from '@prisma/client';
import { RegisterUserUseCase } from '../modules/identity/application/use-cases/register-user.use-case';
import { AuthenticateUserUseCase } from '../modules/identity/application/use-cases/authenticate-user.use-case';
import {
  IdentityApplicationError,
  IdentityErrorCode,
} from '../modules/identity/application/errors/identity-application.error';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private registerUserUseCase: RegisterUserUseCase,
    private authenticateUserUseCase: AuthenticateUserUseCase,
  ) {}

  async login(dto: LoginDto, ip?: string) {
    const result = await this.authenticateUserUseCase.execute({
      email: dto.email,
      password: dto.password,
    });

    if (result.isFailure) {
      const error = result.error;
      if (error instanceof IdentityApplicationError) {
        if (error.code === IdentityErrorCode.ACCOUNT_NOT_ACTIVE) {
          throw new UnauthorizedException(error.message);
        }
        throw new UnauthorizedException('Invalid credentials');
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = result.getValue();
    const tokens = await this.generateTokens(user.id, user.email, user.name, user.role as UserRole, user.projectId);

    await this.auditLog(user.id, 'LOGIN', 'auth', user.id, { ip });

    return tokens;
  }

  async register(dto: RegisterDto) {
    // Public self-registration is disabled by default. When enabled it creates
    // an account with the default (low-privilege) role; enterprise accounts
    // are provisioned by an administrator instead.
    if (this.configService.get<string>('ALLOW_PUBLIC_REGISTRATION', 'false') !== 'true') {
      throw new ForbiddenException('Public registration is disabled. Contact an administrator.');
    }

    const result = await this.registerUserUseCase.execute({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });

    if (result.isFailure) {
      const error = result.error;
      if (error instanceof IdentityApplicationError) {
        if (error.code === IdentityErrorCode.EMAIL_ALREADY_REGISTERED) {
          throw new ConflictException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Registration failed');
    }

    const user = result.getValue();
    return this.generateTokens(user.id, user.email, user.name, user.role as UserRole, user.projectId);
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: this.hashToken(refreshToken) },
      include: {
        user: {
          include: {
            roleAssignments: {
              include: {
                role: {
                  include: {
                    permissions: { include: { permission: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!stored || stored.expiresAt < new Date() || stored.revokedAt) {
      // If token is revoked (reuse detected), revoke entire family
      if (stored?.family) {
        await this.prisma.refreshToken.updateMany({
          where: { family: stored.family, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke current token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = stored.user;
    const permissions = new Set<string>();
    for (const assignment of user.roleAssignments) {
      for (const rp of assignment.role.permissions) {
        permissions.add(rp.permission.name);
      }
    }

    return this.generateTokens(
      user.id, user.email, user.name, user.role as UserRole, user.projectId,
      stored.family ?? undefined, Array.from(permissions),
    );
  }

  async logout(refreshToken: string, userId?: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: this.hashToken(refreshToken) },
      data: { revokedAt: new Date() },
    });
    if (userId) {
      await this.auditLog(userId, 'LOGOUT', 'auth', userId);
    }
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: true, message: 'If the email exists, a reset link has been sent.' };
    }

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { token: hashedToken, userId: user.id, email, expiresAt },
    });

    if (process.env.NODE_ENV === 'production') {
      // In production, send email via mail service instead
      return { success: true, message: 'If the email exists, a reset link has been sent.' };
    }
    return { success: true, resetToken: rawToken, message: 'Password reset token generated. (DEV MODE)' };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = this.hashToken(token);
    const stored = await this.prisma.passwordResetToken.findUnique({ where: { token: hashedToken } });

    if (!stored || stored.expiresAt < new Date() || stored.usedAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
    ]);

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditLog(stored.userId, 'PASSWORD_RESET', 'auth', stored.userId);

    return { success: true, message: 'Password reset successfully.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens except current session
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditLog(userId, 'PASSWORD_CHANGE', 'auth', userId);

    return { success: true, message: 'Password changed successfully.' };
  }

  private async generateTokens(
    userId: string,
    email: string,
    name: string,
    role: UserRole,
    projectId: string | null,
    family?: string,
    permissions?: string[],
  ) {
    const userRecord = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
        projectAssignments: true,
      },
    });

    const roleNames = userRecord?.roleAssignments.map((a) => a.role.name) ?? [];
    const projectIds = userRecord?.projectAssignments.map((a) => a.projectId) ?? [];

    const payload: any = {
      sub: userId,
      email,
      name,
      role,
      projectId,
      roleNames,
      projectIds,
      employeeId: userRecord?.employeeId ?? null,
    };

    if (permissions) {
      payload.permissions = permissions;
    } else {
      const dbPermissions = new Set<string>();
      for (const assignment of (userRecord?.roleAssignments ?? [])) {
        for (const rp of assignment.role.permissions) {
          dbPermissions.add(rp.permission.name);
        }
      }
      payload.permissions = Array.from(dbPermissions);
    }

    const accessToken = this.jwtService.sign(payload);

    const tokenFamily = family ?? randomBytes(16).toString('hex');
    const refreshToken = randomBytes(40).toString('hex');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = this.addDuration(new Date(), refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: { token: this.hashToken(refreshToken), userId, family: tokenFamily, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        name,
        role,
        projectId,
        permissions: payload.permissions,
        roleNames,
        projectIds,
        employeeId: userRecord?.employeeId ?? null,
        status: userRecord?.status ?? 'ACTIVE',
        avatarUrl: userRecord?.avatarUrl ?? null,
      },
    };
  }

  private async auditLog(userId: string, action: string, entity: string, entityId: string, metadata?: any) {
    try {
      await this.prisma.auditLog.create({
        data: { userId, action, entity, entityId, metadata: metadata ?? {} },
      });
    } catch {
      // Audit log failure should not break the main flow
    }
  }

  async getFullUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        projectId: true,
        createdAt: true,
        updatedAt: true,
        employeeId: true,
        avatarUrl: true,
        roleAssignments: {
          include: { role: true },
        },
        projectAssignments: {
          include: { project: { select: { id: true, name: true, code: true } } },
        },
      },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private addDuration(date: Date, duration: string): Date {
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const result = new Date(date);
    switch (unit) {
      case 'd': result.setDate(result.getDate() + value); break;
      case 'h': result.setHours(result.getHours() + value); break;
      case 'm': result.setMinutes(result.getMinutes() + value); break;
      case 's': result.setSeconds(result.getSeconds() + value); break;
    }
    return result;
  }
}
