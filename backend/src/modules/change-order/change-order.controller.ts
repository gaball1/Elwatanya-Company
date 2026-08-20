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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChangeOrderService } from './application/change-order.service';
import {
  CreateChangeOrderDto,
  UpdateChangeOrderDto,
  RejectChangeOrderDto,
} from './dto/change-order.dto';

@ApiTags('Change Orders')
@ApiBearerAuth()
@Controller('change-orders')
export class ChangeOrderController {
  constructor(private readonly changeOrderService: ChangeOrderService) {}

  @Get()
  @ApiOperation({ summary: 'List change orders for a project' })
  @RequirePermission('settings.read')
  async list(@Query('projectId') projectId: string) {
    const items = await this.changeOrderService.list(projectId);
    return { items };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get change order by id' })
  @RequirePermission('settings.read')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const changeOrder = await this.changeOrderService.getById(id);
    return { changeOrder };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a change order' })
  @RequirePermission('settings.write')
  async create(@Body() dto: CreateChangeOrderDto, @CurrentUser('sub') userId: string) {
    try {
      const changeOrder = await this.changeOrderService.create(dto);
      return { changeOrder };
    } catch (error) {
      handleError(error, 'Failed to create change order');
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a change order' })
  @RequirePermission('settings.write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChangeOrderDto,
  ) {
    try {
      const changeOrder = await this.changeOrderService.update(id, dto);
      return { changeOrder };
    } catch (error) {
      handleError(error, 'Failed to update change order');
    }
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a change order' })
  @RequirePermission('settings.write')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    try {
      const changeOrder = await this.changeOrderService.approve(id, userId);
      return { changeOrder };
    } catch (error) {
      handleError(error, 'Failed to approve change order');
    }
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a change order' })
  @RequirePermission('settings.write')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectChangeOrderDto,
  ) {
    try {
      const changeOrder = await this.changeOrderService.reject(id, dto.rejectionReason);
      return { changeOrder };
    } catch (error) {
      handleError(error, 'Failed to reject change order');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a change order' })
  @RequirePermission('settings.write')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.changeOrderService.delete(id);
    } catch (error) {
      handleError(error, 'Failed to delete change order');
    }
  }
}
