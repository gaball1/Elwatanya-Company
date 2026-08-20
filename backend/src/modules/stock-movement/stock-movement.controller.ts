import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ListStockMovementsUseCase } from './application/use-cases/list-stock-movements.use-case';
import { CreateStockMovementUseCase } from './application/use-cases/create-stock-movement.use-case';
import { UpdateStockMovementUseCase } from './application/use-cases/update-stock-movement.use-case';
import { DeleteStockMovementUseCase } from './application/use-cases/delete-stock-movement.use-case';
import { CreateStockMovementDto, UpdateStockMovementDto } from './dto/stock-movement.dto';

@ApiTags('Stock Movements')
@ApiBearerAuth()
@Controller('stock-movements')
export class StockMovementController {
  constructor(
    private readonly listMovements: ListStockMovementsUseCase,
    private readonly createMovement: CreateStockMovementUseCase,
    private readonly updateMovement: UpdateStockMovementUseCase,
    private readonly deleteMovement: DeleteStockMovementUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List stock movements' })
  @RequirePermission(Permissions.StockMovements.Read)
  async list(@CurrentUser() user?: JwtPayload) {
    const result = await this.listMovements.execute(user);
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock movement by id' })
  @RequirePermission(Permissions.StockMovements.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.listMovements.execute(user);
    const movement = result.getValue()?.find((m) => m.id === id);
    if (!movement) throw new NotFoundException('Stock movement not found');
    return { movement };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a stock movement' })
  @RequirePermission(Permissions.StockMovements.Create)
  async create(@Body() dto: CreateStockMovementDto, @CurrentUser() user?: JwtPayload, @CurrentUser('sub') userId?: string) {
    const result = await this.createMovement.execute({
      itemId: dto.itemId, type: dto.type as any, quantity: dto.quantity,
      date: dto.date ? new Date(dto.date) : undefined, reference: dto.reference,
      reason: dto.reason, notes: dto.notes, issuedTo: dto.issuedTo,
      supplier: dto.supplier, fromWarehouse: dto.fromWarehouse, toWarehouse: dto.toWarehouse,
    }, user, userId);
    if (result.isFailure) handleError(result.error?.message, 'Failed to create stock movement');
    return { movement: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update stock movement' })
  @RequirePermission(Permissions.StockMovements.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStockMovementDto, @CurrentUser() user?: JwtPayload, @CurrentUser('sub') userId?: string) {
    const result = await this.updateMovement.execute({
      id, itemId: dto.itemId, type: dto.type as any, quantity: dto.quantity,
      date: dto.date ? new Date(dto.date) : undefined, reference: dto.reference,
      reason: dto.reason, notes: dto.notes, issuedTo: dto.issuedTo,
      supplier: dto.supplier, fromWarehouse: dto.fromWarehouse, toWarehouse: dto.toWarehouse,
    }, user, userId);
    if (result.isFailure) handleError(result.error?.message, 'Failed to update stock movement');
    return { movement: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a stock movement' })
  @RequirePermission(Permissions.StockMovements.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.deleteMovement.execute(id, user);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete stock movement');
  }
}
