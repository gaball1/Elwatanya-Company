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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import { ListFinalBoqItemsUseCase } from './application/use-cases/list-final-boq-items.use-case';
import { SyncFinalFromAnalyticalUseCase } from './application/use-cases/sync-final-from-analytical.use-case';
import { ImportFinalFromEmployerUseCase } from './application/use-cases/import-final-from-employer.use-case';
import {
  UpdateFinalBoqItemUseCase,
  UpdateFinalItemQuantityUseCase,
  RemoveFinalBoqItemUseCase,
} from './application/use-cases/update-final-boq-item.use-case';
import {
  AnalyzeFinalBoqItemUseCase,
  AddFinalBoqComponentUseCase,
  UpdateFinalBoqComponentUseCase,
  RemoveFinalBoqComponentUseCase,
} from './application/use-cases/analyze-final-boq-item.use-case';
import {
  FinalBoqApplicationError,
  FinalBoqErrorCode,
} from './application/errors/final-boq-application.error';
import {
  AnalyzeFinalBoqItemDto,
  ImportFinalFromEmployerDto,
  UpdateFinalBoqItemDto,
  UpdateFinalItemQuantityDto,
  AddFinalBoqComponentDto,
  UpdateFinalBoqComponentDto,
} from './dto/final-boq.dto';

@ApiTags('Final BOQ')
@ApiBearerAuth()
@Controller()
export class FinalBoqController {
  constructor(
    private readonly listFinalBoqItems: ListFinalBoqItemsUseCase,
    private readonly syncFinalFromAnalytical: SyncFinalFromAnalyticalUseCase,
    private readonly importFinalFromEmployer: ImportFinalFromEmployerUseCase,
    private readonly updateFinalBoqItem: UpdateFinalBoqItemUseCase,
    private readonly updateFinalItemQuantity: UpdateFinalItemQuantityUseCase,
    private readonly removeFinalBoqItem: RemoveFinalBoqItemUseCase,
    private readonly analyzeFinalBoqItem: AnalyzeFinalBoqItemUseCase,
    private readonly addFinalBoqComponent: AddFinalBoqComponentUseCase,
    private readonly updateFinalBoqComponent: UpdateFinalBoqComponentUseCase,
    private readonly removeFinalBoqComponent: RemoveFinalBoqComponentUseCase,
  ) {}

  @Get('buildings/:buildingId/boq/final')
  @ApiOperation({ summary: 'List final BOQ items for a building (mirrors getFinalItems)' })
  @RequirePermission(Permissions.FinalBoq.Read)
  async list(@Param('buildingId', ParseUUIDPipe) buildingId: string, @CurrentUser('projectId') projectId?: string) {
    const result = await this.listFinalBoqItems.execute(buildingId, projectId);
    if (result.isFailure) throw this.mapError(result.error);
    return result.getValue();
  }

  @Post('buildings/:buildingId/boq/final/sync-from-analytical')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync final BOQ from analytical (mirrors syncFinalFromAnalytical)' })
  @RequirePermission(Permissions.FinalBoq.Sync)
  async sync(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.syncFinalFromAnalytical.execute({ buildingId }, projectId, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { items: result.getValue() };
  }

  @Post('buildings/:buildingId/boq/final/import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import final item from employer BOQ' })
  @RequirePermission(Permissions.FinalBoq.Import)
  async importFromEmployer(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: ImportFinalFromEmployerDto,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.importFinalFromEmployer.execute({
      buildingId,
      itemCode: dto.itemCode,
    }, projectId, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { item: result.getValue() };
  }

  @Patch('buildings/:buildingId/boq/final/items/:itemCode')
  @ApiOperation({ summary: 'Update final BOQ item (mirrors updateFinalItem)' })
  @RequirePermission(Permissions.FinalBoq.Write)
  async update(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Body() dto: UpdateFinalBoqItemDto,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.updateFinalBoqItem.execute({
      buildingId,
      itemCode,
      description: dto.description,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      unit: dto.unit,
      status: dto.status,
    }, projectId, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { item: result.getValue() };
  }

  @Patch('buildings/:buildingId/boq/final/items/:itemCode/quantity')
  @ApiOperation({ summary: 'Update final item quantity with allocation guard' })
  @RequirePermission(Permissions.FinalBoq.Write)
  async updateQuantity(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Body() dto: UpdateFinalItemQuantityDto,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.updateFinalItemQuantity.execute({
      buildingId,
      itemCode,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
    }, projectId, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { item: result.getValue() };
  }

  @Delete('buildings/:buildingId/boq/final/items/:itemCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove final BOQ item' })
  @RequirePermission(Permissions.FinalBoq.Write)
  async remove(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.removeFinalBoqItem.execute(buildingId, itemCode, projectId, userId);
    if (result.isFailure) throw this.mapError(result.error);
  }

  @Post('buildings/:buildingId/boq/final/items/:itemCode/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze final item into components (mirrors analyzeFinalItem)' })
  @RequirePermission(Permissions.FinalBoq.Analyze)
  async analyze(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Body() dto: AnalyzeFinalBoqItemDto,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.analyzeFinalBoqItem.execute({
      buildingId,
      itemCode,
      components: dto.components,
    }, projectId, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { item: result.getValue() };
  }

  @Post('buildings/:buildingId/boq/final/items/:itemCode/components')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add component to final item' })
  @RequirePermission(Permissions.FinalBoq.ManageComponents)
  async addComponent(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Body() dto: AddFinalBoqComponentDto,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.addFinalBoqComponent.execute({
      buildingId,
      itemCode,
      name: dto.name,
      unit: dto.unit,
      unitPrice: dto.unitPrice,
    }, projectId, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { item: result.getValue() };
  }

  @Patch('buildings/:buildingId/boq/final/items/:itemCode/components/:componentId')
  @ApiOperation({ summary: 'Update component price/quantity' })
  @RequirePermission(Permissions.FinalBoq.ManageComponents)
  async updateComponent(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Param('componentId', ParseUUIDPipe) componentId: string,
    @Body() dto: UpdateFinalBoqComponentDto,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.updateFinalBoqComponent.execute({
      buildingId,
      itemCode,
      componentId,
      unitPrice: dto.unitPrice,
      quantity: dto.quantity,
    }, projectId, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { item: result.getValue() };
  }

  @Delete('buildings/:buildingId/boq/final/items/:itemCode/components/:componentId')
  @ApiOperation({ summary: 'Remove component from final item' })
  @RequirePermission(Permissions.FinalBoq.ManageComponents)
  async removeComponent(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Param('componentId', ParseUUIDPipe) componentId: string,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.removeFinalBoqComponent.execute({
      buildingId,
      itemCode,
      componentId,
    }, projectId, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { item: result.getValue() };
  }

  private mapError(error: Error | undefined): Error {
    if (error instanceof BuildingApplicationError) {
      if (error.code === BuildingErrorCode.NOT_FOUND) {
        return new NotFoundException(error.message);
      }
      return new BadRequestException(error.message);
    }

    if (error instanceof FinalBoqApplicationError) {
      switch (error.code) {
        case FinalBoqErrorCode.ITEM_NOT_FOUND:
        case FinalBoqErrorCode.COMPONENT_NOT_FOUND:
        case FinalBoqErrorCode.EMPLOYER_ITEM_NOT_FOUND:
          return new NotFoundException(error.message);
        default:
          return new BadRequestException(error.message);
      }
    }

    return new BadRequestException(error?.message ?? 'Final BOQ operation failed');
  }
}
