import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { ListPurchasesUseCase } from './application/use-cases/list-purchases.use-case';
import { CreatePurchaseUseCase } from './application/use-cases/create-purchase.use-case';
import { UpdatePurchaseUseCase } from './application/use-cases/update-purchase.use-case';
import { DeletePurchaseUseCase } from './application/use-cases/delete-purchase.use-case';
import { UpdatePurchaseStatusUseCase } from './application/use-cases/update-purchase-status.use-case';
import { CreatePurchaseDto, UpdatePurchaseDto, UpdatePurchaseStatusDto } from './dto/purchase.dto';
import { PURCHASE_REPOSITORY, IPurchaseRepository } from './domain/purchase.repository';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { toResult } from './application/dto/purchase.dto';

@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
export class PurchaseController {
  constructor(
    private readonly listPurchases: ListPurchasesUseCase,
    private readonly createPurchase: CreatePurchaseUseCase,
    private readonly updatePurchase: UpdatePurchaseUseCase,
    private readonly deletePurchase: DeletePurchaseUseCase,
    private readonly updatePurchaseStatus: UpdatePurchaseStatusUseCase,
    @Inject(PURCHASE_REPOSITORY) private readonly purchaseRepo: IPurchaseRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List purchases (optional filter by projectId and status)' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'received', 'cancelled'] })
  @RequirePermission(Permissions.Purchases.Read)
  async list(@Query('projectId') projectId?: string, @Query('status') status?: string) {
    const result = await this.listPurchases.execute(projectId, status);
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase by id' })
  @RequirePermission(Permissions.Purchases.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const purchase = await this.purchaseRepo.findById(new UniqueEntityId(id));
    if (!purchase) throw new NotFoundException('Purchase not found');
    return { purchase: toResult(purchase) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a purchase record' })
  @RequirePermission(Permissions.Purchases.Create)
  async create(@Body() dto: CreatePurchaseDto) {
    const result = await this.createPurchase.execute({
      projectId: dto.projectId,
      buildingId: dto.buildingId,
      supplierId: dto.supplierId,
      itemName: dto.itemName,
      quantity: dto.quantity,
      unit: dto.unit,
      unitPrice: dto.unitPrice,
      date: new Date(dto.date),
      notes: dto.notes,
      invoiceFile: dto.invoiceFile,
      supplierName: dto.supplierName,
      createdBy: dto.createdBy,
      categoryId: dto.categoryId,
      inventoryItemId: dto.inventoryItemId,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create purchase');
    return { purchase: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update purchase fields' })
  @RequirePermission(Permissions.Purchases.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePurchaseDto) {
    const result = await this.updatePurchase.execute({
      id,
      itemName: dto.itemName,
      quantity: dto.quantity,
      unit: dto.unit,
      unitPrice: dto.unitPrice,
      date: dto.date !== undefined ? new Date(dto.date) : undefined,
      notes: dto.notes,
      invoiceFile: dto.invoiceFile,
      supplierName: dto.supplierName,
      buildingId: dto.buildingId,
      supplierId: dto.supplierId,
      createdBy: dto.createdBy,
      categoryId: dto.categoryId,
      inventoryItemId: dto.inventoryItemId,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update purchase');
    return { purchase: result.getValue() };
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update purchase status' })
  @RequirePermission(Permissions.Purchases.Update)
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePurchaseStatusDto) {
    const result = await this.updatePurchaseStatus.execute(id, dto.status);
    if (result.isFailure) handleError(result.error?.message, 'Failed to update status');
    return { purchase: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a purchase' })
  @RequirePermission(Permissions.Purchases.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deletePurchase.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete purchase');
  }
}
