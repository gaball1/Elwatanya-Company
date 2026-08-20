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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { OwnershipService } from '@/common/services/ownership.service';
import { ListWarehousesUseCase } from './application/use-cases/list-warehouses.use-case';
import { CreateWarehouseUseCase } from './application/use-cases/create-warehouse.use-case';
import { UpdateWarehouseUseCase } from './application/use-cases/update-warehouse.use-case';
import { DeleteWarehouseUseCase } from './application/use-cases/delete-warehouse.use-case';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';

@ApiTags('Warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehouseController {
  constructor(
    private readonly listWarehouses: ListWarehousesUseCase,
    private readonly createWarehouse: CreateWarehouseUseCase,
    private readonly updateWarehouse: UpdateWarehouseUseCase,
    private readonly deleteWarehouse: DeleteWarehouseUseCase,
    private readonly ownership: OwnershipService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List warehouses' })
  @RequirePermission(Permissions.Warehouses.Read)
  async list(@Query('projectId') projectId?: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.listWarehouses.execute(projectId, user);
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse by id' })
  @RequirePermission(Permissions.Warehouses.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.listWarehouses.execute(undefined, user);
    const warehouse = result.getValue()?.find((w) => w.id === id);
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return { warehouse };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a warehouse' })
  @RequirePermission(Permissions.Warehouses.Create)
  async create(@Body() dto: CreateWarehouseDto, @CurrentUser() user?: JwtPayload, @CurrentUser('sub') userId?: string) {
    const result = await this.createWarehouse.execute({
      projectId: dto.projectId,
      code: dto.code,
      name: dto.name,
      location: dto.location,
      status: dto.status,
    }, user, userId);
    if (result.isFailure) handleError(result.error?.message, 'Failed to create warehouse');
    return { warehouse: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update warehouse' })
  @RequirePermission(Permissions.Warehouses.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseDto, @CurrentUser() user?: JwtPayload, @CurrentUser('sub') userId?: string) {
    const result = await this.updateWarehouse.execute({
      id,
      projectId: dto.projectId,
      code: dto.code,
      name: dto.name,
      location: dto.location,
      status: dto.status,
    }, user, userId);
    if (result.isFailure) handleError(result.error?.message, 'Failed to update warehouse');
    return { warehouse: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a warehouse' })
  @RequirePermission(Permissions.Warehouses.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.deleteWarehouse.execute(id, user);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete warehouse');
  }
}
