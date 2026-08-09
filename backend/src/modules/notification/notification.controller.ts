import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
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
    private readonly createNotification: CreateNotificationUseCase,
    private readonly markReadNotification: MarkReadNotificationUseCase,
    private readonly markAllRead: MarkAllReadUseCase,
    private readonly clearNotifications: ClearNotificationsUseCase,
    private readonly deleteNotification: DeleteNotificationUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  @RequirePermission(Permissions.Notifications.Read)
  @ApiQuery({ name: 'type', required: false, enum: ['info', 'warning', 'error'] })
  @ApiQuery({ name: 'read', required: false, type: Boolean })
  async list(@Query() query: ListNotificationsQueryDto) {
    const result = await this.listNotifications.execute({
      type: query.type as any,
      read: query.read,
    });
    return { items: result.getValue() };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a notification' })
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
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create notification');
    return { notification: result.getValue() };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @RequirePermission(Permissions.Notifications.Update)
  async markAll() {
    const result = await this.markAllRead.execute();
    return { count: result.getValue()?.count ?? 0 };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all notifications (soft-delete)' })
  @RequirePermission(Permissions.Notifications.Delete)
  async clearAll() {
    const result = await this.clearNotifications.execute();
    return { count: result.getValue()?.count ?? 0 };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @RequirePermission(Permissions.Notifications.Update)
  async markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.markReadNotification.execute(id);
    if (result.isFailure) handleError(result.error, 'Failed to process request');
    return { notification: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a notification' })
  @RequirePermission(Permissions.Notifications.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteNotification.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete notification');
  }
}
