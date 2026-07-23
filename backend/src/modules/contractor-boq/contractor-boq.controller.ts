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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import {
  ListContractorBoqItemsUseCase,
  SetContractorMetaUseCase,
  GetContractorMetaUseCase,
  AllocateContractorItemUseCase,
  UpdateContractorItemQuantityUseCase,
  RemoveContractorItemUseCase,
  GetAvailableContractorQtyUseCase,
} from './application/use-cases/contractor-boq.use-cases';
import {
  ContractorBoqApplicationError,
  ContractorBoqErrorCode,
} from './application/errors/contractor-boq-application.error';
import {
  AllocateContractorItemDto,
  SetContractorMetaDto,
  UpdateContractorItemQuantityDto,
} from './dto/contractor-boq.dto';

@ApiTags('Contractor BOQ')
@ApiBearerAuth()
@Controller()
export class ContractorBoqController {
  constructor(
    private readonly listItems: ListContractorBoqItemsUseCase,
    private readonly setMeta: SetContractorMetaUseCase,
    private readonly getMeta: GetContractorMetaUseCase,
    private readonly allocate: AllocateContractorItemUseCase,
    private readonly updateQty: UpdateContractorItemQuantityUseCase,
    private readonly removeItem: RemoveContractorItemUseCase,
    private readonly availableQty: GetAvailableContractorQtyUseCase,
  ) {}

  @Get('buildings/:buildingId/contractors/:contractorId/boq')
  @ApiOperation({ summary: 'List contractor BOQ items (mirrors getContractorBoq)' })
  async list(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
  ) {
    const result = await this.listItems.execute(buildingId, contractorId);
    if (result.isFailure) throw this.mapError(result.error);
    return { items: result.getValue() };
  }

  @Get('buildings/:buildingId/contractors/:contractorId/boq/meta')
  @ApiOperation({ summary: 'Get contractor BOQ meta' })
  async meta(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
  ) {
    const result = await this.getMeta.execute(buildingId, contractorId);
    if (result.isFailure) throw this.mapError(result.error);
    return { meta: result.getValue() };
  }

  @Put('buildings/:buildingId/contractors/:contractorId/boq/meta')
  @ApiOperation({ summary: 'Set contractor BOQ meta (mirrors setContractorMeta)' })
  async setMetaHandler(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Body() dto: SetContractorMetaDto,
  ) {
    const result = await this.setMeta.execute({
      buildingId,
      contractorId,
      workType: dto.workType,
    });
    if (result.isFailure) throw this.mapError(result.error);
    return { meta: result.getValue() };
  }

  @Post('buildings/:buildingId/contractors/:contractorId/boq/allocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Allocate final item/component to contractor' })
  async allocateHandler(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Body() dto: AllocateContractorItemDto,
  ) {
    const result = await this.allocate.execute({
      buildingId,
      contractorId,
      itemCodeOrComponent: dto.itemCodeOrComponent,
      quantity: dto.quantity,
    });
    if (result.isFailure) throw this.mapError(result.error);
    return { items: result.getValue() };
  }

  @Patch('buildings/:buildingId/contractors/:contractorId/boq/items/:itemCode')
  @ApiOperation({ summary: 'Update contractor item assigned quantity' })
  async updateQuantity(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Param('itemCode') itemCode: string,
    @Body() dto: UpdateContractorItemQuantityDto,
  ) {
    const result = await this.updateQty.execute({
      buildingId,
      contractorId,
      itemCode,
      componentId: dto.componentId,
      quantity: dto.quantity,
    });
    if (result.isFailure) throw this.mapError(result.error);
    return { items: result.getValue() };
  }

  @Delete('buildings/:buildingId/contractors/:contractorId/boq/items/:itemCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove contractor BOQ item' })
  async remove(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Param('itemCode') itemCode: string,
    @Query('componentId') componentId?: string,
  ) {
    const result = await this.removeItem.execute(
      buildingId,
      contractorId,
      itemCode,
      componentId,
    );
    if (result.isFailure) throw this.mapError(result.error);
  }

  @Get('buildings/:buildingId/contractors/:contractorId/boq/available')
  @ApiOperation({ summary: 'Available qty for contractor item/component' })
  async available(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Query('itemCode') itemCode: string,
    @Query('componentId') componentId?: string,
  ) {
    const result = await this.availableQty.execute({
      buildingId,
      contractorId,
      itemCode,
      componentId,
    });
    if (result.isFailure) throw this.mapError(result.error);
    return { available: result.getValue() };
  }

  private mapError(error: Error | undefined): Error {
    if (error instanceof BuildingApplicationError) {
      if (error.code === BuildingErrorCode.NOT_FOUND) {
        return new NotFoundException(error.message);
      }
      return new BadRequestException(error.message);
    }
    if (error instanceof ContractorBoqApplicationError) {
      switch (error.code) {
        case ContractorBoqErrorCode.FINAL_ITEM_NOT_FOUND:
        case ContractorBoqErrorCode.ITEM_NOT_FOUND:
        case ContractorBoqErrorCode.SUBCONTRACTOR_NOT_FOUND:
          return new NotFoundException(error.message);
        default:
          return new BadRequestException(error.message);
      }
    }
    return new BadRequestException(error?.message ?? 'Contractor BOQ operation failed');
  }
}
