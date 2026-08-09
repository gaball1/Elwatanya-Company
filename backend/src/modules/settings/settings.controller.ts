import { Controller, Get, Put, Param, Body, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { UpdateSettingDto, UpdateSettingGroupDto } from './dto/update-setting.dto';
import { NotificationService } from '@/common/services/notification.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly notifications: NotificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  @RequirePermission(Permissions.Settings.Read)
  async getAll() {
    return { settings: await this.settingsService.getAll() };
  }

  @Get(':group')
  @ApiOperation({ summary: 'Get settings by group' })
  @RequirePermission(Permissions.Settings.Read)
  async getGroup(@Param('group') group: string) {
    const settings = await this.settingsService.getGroup(group);
    if (!settings || Object.keys(settings).length === 0) {
      throw new NotFoundException(`Settings group '${group}' not found`);
    }
    return { group, settings };
  }

  @Get(':group/:key')
  @ApiOperation({ summary: 'Get a single setting' })
  @RequirePermission(Permissions.Settings.Read)
  async get(@Param('group') group: string, @Param('key') key: string) {
    const value = await this.settingsService.get(group, key);
    if (value === undefined) {
      throw new NotFoundException(`Setting '${group}.${key}' not found`);
    }
    return { group, key, value };
  }

  @Put(':group/:key')
  @ApiOperation({ summary: 'Update a single setting' })
  @RequirePermission(Permissions.Settings.Write)
  async update(@Param('group') group: string, @Param('key') key: string, @Body() dto: UpdateSettingDto) {
    await this.settingsService.set(group, key, dto.value);
    await this.notifications.createForAllUsers({
      title: 'تم تحديث إعدادات النظام',
      titleEn: 'System Settings Updated',
      message: `تم تحديث الإعداد ${group}.${key}`,
      messageEn: `Setting ${group}.${key} was updated`,
      type: 'info',
      entityType: 'settings',
      entityId: `${group}.${key}`,
      link: '/settings',
    });
    return { group, key, value: dto.value };
  }

  @Put(':group')
  @ApiOperation({ summary: 'Update an entire settings group' })
  @RequirePermission(Permissions.Settings.Write)
  async updateGroup(@Param('group') group: string, @Body() dto: UpdateSettingGroupDto) {
    await this.settingsService.setGroup(group, dto.values);
    await this.notifications.createForAllUsers({
      title: 'تم تحديث إعدادات النظام',
      titleEn: 'System Settings Updated',
      message: `تم تحديث مجموعة الإعدادات ${group}`,
      messageEn: `Settings group ${group} was updated`,
      type: 'info',
      entityType: 'settings',
      entityId: group,
      link: '/settings',
    });
    return { group, values: dto.values };
  }
}
