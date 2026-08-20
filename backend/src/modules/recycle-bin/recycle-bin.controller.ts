import { Controller, Post, Get, Delete, Param, Query, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecycleBinService } from './recycle-bin.service';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@ApiTags('Recycle Bin')
@ApiBearerAuth()
@Controller('recycle-bin')
export class RecycleBinController {
  constructor(private readonly service: RecycleBinService) {}

  @Get()
  @ApiOperation({ summary: 'List all soft-deleted items' })
  @ApiQuery({ name: 'entity', required: false })
  @RequirePermission('recycle-bin.view')
  async list(@Query('entity') entity?: string) {
    return this.service.listDeleted(entity);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get database statistics for all entities' })
  @RequirePermission('recycle-bin.view')
  async stats() {
    return this.service.getStats();
  }

  @Post(':entity/:id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted item' })
  @RequirePermission('recycle-bin.restore')
  async restore(@Param('entity') entity: string, @Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.service.restore(entity, id);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @Delete(':entity/:id')
  @ApiOperation({ summary: 'Permanently delete an item' })
  @RequirePermission('recycle-bin.delete')
  async permanentDelete(@Param('entity') entity: string, @Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.service.permanentDelete(entity, id);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }
}
