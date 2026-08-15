import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { isAdminUser } from '../../common/utils/is-admin.util';
import { Permissions } from '../../common/constants/permissions.constant';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
import { CountUnreadNotificationsUseCase } from './application/use-cases/count-unread-notifications.use-case';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case';
import { MarkReadNotificationUseCase } from './application/use-cases/mark-read-notification.use-case';
import { MarkAllReadUseCase } from './application/use-cases/mark-all-read.use-case';
import { ClearNotificationsUseCase } from './application/use-cases/clear-notifications.use-case';
import { DeleteNotificationUseCase } from './application/use-cases/delete-notification.use-case';
import { CreateNotificationDto, ListNotificationsQueryDto } from './dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly listNotifications: ListNotificationsUseCase,
    private readonly countUnreadNotifications: CountUnreadNotificationsUseCase,
    private readonly createNotification: CreateNotificationUseCase,
    private readonly markReadNotification: MarkReadNotificationUseCase,
    private readonly markAllRead: MarkAllReadUseCase,
    private readonly clearNotifications: ClearNotificationsUseCase,
    private readonly deleteNotification: DeleteNotificationUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications (own + broadcasts)' })
  @ApiQuery({ name: 'type', required: false, enum: ['info', 'warning', 'error'] })
  @ApiQuery({ name: 'read', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@Query() query: ListNotificationsQueryDto, @CurrentUser() user: any) {
    const result = await this.listNotifications.execute(
      user?.sub,
      isAdminUser(user),
      {
        type: query.type as any,
        read: query.read,
        limit: query.limit,
        roleNames: Array.isArray(user?.roleNames) ? user.roleNames : [],
        permissionNames: Array.isArray(user?.permissions) ? user.permissions : [],
      },
    );
    return { items: result.getValue() };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count unread notifications for the current user' })
  async unreadCount(@CurrentUser() user: any) {
    const result = await this.countUnreadNotifications.execute(
      user?.sub,
      isAdminUser(user),
      {
        roleNames: Array.isArray(user?.roleNames) ? user.roleNames : [],
        permissionNames: Array.isArray(user?.permissions) ? user.permissions : [],
      },
    );
    return { count: result.getValue() };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a notification (target users, roles or permission holders)' })
  @RequirePermission(Permissions.Notifications.Create)
  async create(@Body() dto: CreateNotificationDto) {
    const result = await this.createNotification.execute({
      title: dto.title,
      titleEn: dto.titleEn,
      message: dto.message,
      messageEn: dto.messageEn,
      type: dto.type,
      userId: dto.userId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      link: dto.link,
      targetRoles: dto.targetRoles,
      targetPermissions: dto.targetPermissions,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create notification');
    return { notification: result.getValue() };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications (dedicated to the user) as read' })
  async markAll(@CurrentUser() user: any) {
    const result = await this.markAllRead.execute(
      user?.sub,
      isAdminUser(user),
      {
        roleNames: Array.isArray(user?.roleNames) ? user.roleNames : [],
        permissionNames: Array.isArray(user?.permissions) ? user.permissions : [],
      },
    );
    return { count: result.getValue()?.count ?? 0 };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all notifications dedicated to the user (soft-delete)' })
  async clearAll(@CurrentUser() user: any) {
    const result = await this.clearNotifications.execute(
      user?.sub,
      isAdminUser(user),
      {
        roleNames: Array.isArray(user?.roleNames) ? user.roleNames : [],
        permissionNames: Array.isArray(user?.permissions) ? user.permissions : [],
      },
    );
    return { count: result.getValue()?.count ?? 0 };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const result = await this.markReadNotification.execute(
      id,
      user?.sub,
      isAdminUser(user),
      Array.isArray(user?.roleNames) ? user.roleNames : [],
      Array.isArray(user?.permissions) ? user.permissions : [],
    );
    if (result.isFailure) handleError(result.error, 'Failed to process request');
    return { notification: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a notification' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const result = await this.deleteNotification.execute(
      id,
      user?.sub,
      isAdminUser(user),
      Array.isArray(user?.roleNames) ? user.roleNames : [],
      Array.isArray(user?.permissions) ? user.permissions : [],
    );
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete notification');
  }
}
