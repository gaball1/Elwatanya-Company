import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { ListInventoryItemsUseCase } from './application/use-cases/list-inventory-items.use-case';
import { CreateInventoryItemUseCase } from './application/use-cases/create-inventory-item.use-case';
import { UpdateInventoryItemUseCase } from './application/use-cases/update-inventory-item.use-case';
import { DeleteInventoryItemUseCase } from './application/use-cases/delete-inventory-item.use-case';
import { IncreaseInventoryItemUseCase } from './application/use-cases/increase-inventory-item.use-case';
import { CreateInventoryItemDto, IncreaseInventoryItemDto, UpdateInventoryItemDto } from './dto/inventory-item.dto';

@ApiTags('Inventory Items')
@ApiBearerAuth()
@Controller('inventory-items')
export class InventoryItemController {
  constructor(
    private readonly listItems: ListInventoryItemsUseCase,
    private readonly createItem: CreateInventoryItemUseCase,
    private readonly updateItem: UpdateInventoryItemUseCase,
    private readonly deleteItem: DeleteInventoryItemUseCase,
    private readonly increaseItem: IncreaseInventoryItemUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List inventory items (optional filters by categoryId, warehouseId, or projectId)' })
  @RequirePermission(Permissions.Inventory.Read)
  async list(@Query('categoryId') categoryId?: string, @Query('warehouseId') warehouseId?: string, @Query('projectId') projectId?: string) {
    const result = await this.listItems.execute(categoryId, warehouseId, projectId);
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by id' })
  @RequirePermission(Permissions.Inventory.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.listItems.execute();
    const item = result.getValue()?.find((i) => i.id === id);
    if (!item) throw new NotFoundException('Inventory item not found');
    return { item };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an inventory item' })
  @RequirePermission(Permissions.Inventory.Create)
  async create(@Body() dto: CreateInventoryItemDto) {
    const result = await this.createItem.execute({ code: dto.code, name: dto.name, description: dto.description, categoryId: dto.categoryId, warehouseId: dto.warehouseId, projectId: dto.projectId, unit: dto.unit, quantity: dto.quantity, reason: dto.reason, minQuantity: dto.minQuantity, price: dto.price, status: dto.status });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create inventory item');
    return { item: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory item' })
  @RequirePermission(Permissions.Inventory.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInventoryItemDto) {
    const result = await this.updateItem.execute({ id, code: dto.code, name: dto.name, description: dto.description, categoryId: dto.categoryId, warehouseId: dto.warehouseId, projectId: dto.projectId, unit: dto.unit, quantity: dto.quantity, minQuantity: dto.minQuantity, price: dto.price, status: dto.status });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update inventory item');
    return { item: result.getValue() };
  }

  @Post(':id/increase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increase item quantity ("توريد") with an optional reason' })
  @RequirePermission(Permissions.Inventory.Update)
  async increase(@Param('id', ParseUUIDPipe) id: string, @Body() dto: IncreaseInventoryItemDto) {
    const result = await this.increaseItem.execute({ id, quantity: dto.quantity, reason: dto.reason, unitCost: dto.unitCost });
    if (result.isFailure) handleError(result.error?.message, 'Failed to increase inventory item quantity');
    return { item: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an inventory item' })
  @RequirePermission(Permissions.Inventory.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteItem.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete inventory item');
  }
}
