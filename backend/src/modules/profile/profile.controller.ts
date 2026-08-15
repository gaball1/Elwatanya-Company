import { Controller, Get, Patch, Post, Put, Delete, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto, ChangePasswordDto, SaveSignatureDto, SaveAvatarDto } from './dto/profile.dto';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @RequirePermission('profile.read')
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.profile.getProfile(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user profile' })
  @RequirePermission('profile.update')
  async updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.profile.updateProfile(userId, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @RequirePermission('profile.change-password')
  async changePassword(@CurrentUser('sub') userId: string, @Body() dto: ChangePasswordDto) {
    return this.profile.changePassword(userId, dto);
  }

  @Get('signature')
  @ApiOperation({ summary: 'Get current user signature' })
  async getSignature(@CurrentUser('sub') userId: string) {
    return this.profile.getSignature(userId);
  }

  @Put('signature')
  @ApiOperation({ summary: 'Save signature image (base64 data URL)' })
  async saveSignature(@CurrentUser('sub') userId: string, @Body() dto: SaveSignatureDto) {
    return this.profile.saveSignature(userId, dto.signatureUrl);
  }

  @Delete('signature')
  @ApiOperation({ summary: 'Clear current user signature' })
  async clearSignature(@CurrentUser('sub') userId: string) {
    await this.profile.saveSignature(userId, '');
    return { success: true };
  }

  @Put('avatar')
  @ApiOperation({ summary: 'Save profile picture (base64 data URL)' })
  async saveAvatar(@CurrentUser('sub') userId: string, @Body() dto: SaveAvatarDto) {
    return this.profile.saveAvatar(userId, dto.avatarUrl);
  }
}
