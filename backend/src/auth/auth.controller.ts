import {
  Controller, Post, Get, Body, HttpCode, HttpStatus, Req, Res, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import {
  LoginDto, RegisterDto, RefreshTokenDto, ForgotPasswordDto,
  ResetPasswordDto, ChangePasswordDto,
} from './dto/auth.dto';
import { Public } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Authenticate user and return JWT tokens' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, req.ip);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Refresh access token with rotation' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token || dto.refreshToken;
    if (!token) {
      return { accessToken: null, refreshToken: null, user: null };
    }
    const result = await this.authService.refresh(token);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate refresh token' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @CurrentUser('sub') userId?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const token = req.cookies?.refresh_token || dto.refreshToken;
    if (token) {
      try {
        await this.authService.logout(token, userId);
      } catch {
        // Ignore logout errors - still clear cookie
      }
    }
    res?.clearCookie('refresh_token', { path: '/api/v1/auth' });
    return { success: true };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile with permissions' })
  async getProfile(@CurrentUser() user: any) {
    const fullUser = await this.authService.getFullUser(user.sub);
    return {
      user: {
        id: user.sub,
        email: user.email,
        name: user.name ?? fullUser?.name,
        role: user.role,
        projectId: user.projectId,
        permissions: user.permissions,
        roleNames: user.roleNames,
        projectIds: user.projectIds,
        employeeId: fullUser?.employeeId ?? user.employeeId ?? null,
        status: fullUser?.status,
        avatarUrl: fullUser?.avatarUrl ?? null,
        createdAt: fullUser?.createdAt,
      },
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Request password reset token' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Reset password using token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser('sub') userId: string) {
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const maxAge = this.parseDurationToMs(refreshExpiresIn);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge,
    });
  }

  private parseDurationToMs(duration: string): number {
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      m: 60 * 1000,
      s: 1000,
    };
    return value * (multipliers[unit] ?? 0);
  }
}
