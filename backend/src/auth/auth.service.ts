import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
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

  async login(dto: LoginDto) {
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
    return this.generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      projectId: user.projectId,
    });
  }

  async register(dto: RegisterDto) {
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
    return this.generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      projectId: user.projectId,
    });
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return this.generateTokens(stored.user);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { success: true };
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    projectId: string | null;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      projectId: user.projectId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomBytes(40).toString('hex');
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    const expiresAt = this.addDuration(new Date(), refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        projectId: user.projectId,
      },
    };
  }

  private addDuration(date: Date, duration: string): Date {
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const result = new Date(date);

    switch (unit) {
      case 'd':
        result.setDate(result.getDate() + value);
        break;
      case 'h':
        result.setHours(result.getHours() + value);
        break;
      case 'm':
        result.setMinutes(result.getMinutes() + value);
        break;
      case 's':
        result.setSeconds(result.getSeconds() + value);
        break;
    }

    return result;
  }
}
