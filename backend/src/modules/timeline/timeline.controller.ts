import { Controller, Get, Param, Query, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';

@ApiTags('Timeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timeline: TimelineService) {}

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get entity timeline' })
  @RequirePermission(Permissions.Timeline.Read)
  async getTimeline(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('category') category?: string,
    @Query('limit') limit?: number,
  ) {
    const events = await this.timeline.getTimeline(entityType, entityId, {
      eventCategory: category,
      limit: limit ? Math.min(limit, 100) : 50,
    });
    return { entityType, entityId, events };
  }

  @Get(':entityType/:entityId/lifecycle')
  @ApiOperation({ summary: 'Get entity lifecycle summary' })
  @RequirePermission(Permissions.Timeline.Read)
  async getLifecycle(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const lifecycle = await this.timeline.getEntityLifecycle(entityType, entityId);
    if (!lifecycle.created) {
      throw new NotFoundException(`No timeline found for ${entityType}:${entityId}`);
    }
    return lifecycle;
  }
}
