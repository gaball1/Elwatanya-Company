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
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
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
  @RequirePermission(Permissions.ContractorBoq.Read)
  async list(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.listItems.execute(buildingId, contractorId, user);
    if (result.isFailure) throw this.mapError(result.error);
    return { items: result.getValue() };
  }

  @Get('buildings/:buildingId/contractors/:contractorId/boq/meta')
  @ApiOperation({ summary: 'Get contractor BOQ meta' })
  @RequirePermission(Permissions.ContractorBoq.Read)
  async meta(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.getMeta.execute(buildingId, contractorId, user);
    if (result.isFailure) throw this.mapError(result.error);
    return { meta: result.getValue() };
  }

  @Put('buildings/:buildingId/contractors/:contractorId/boq/meta')
  @ApiOperation({ summary: 'Set contractor BOQ meta (mirrors setContractorMeta)' })
  @RequirePermission(Permissions.ContractorBoq.Write)
  async setMetaHandler(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Body() dto: SetContractorMetaDto,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.setMeta.execute({
      buildingId,
      contractorId,
      workType: dto.workType,
    }, user, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { meta: result.getValue() };
  }

  @Post('buildings/:buildingId/contractors/:contractorId/boq/allocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Allocate final item/component to contractor' })
  @RequirePermission(Permissions.ContractorBoq.Allocate)
  async allocateHandler(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Body() dto: AllocateContractorItemDto,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.allocate.execute({
      buildingId,
      contractorId,
      itemCodeOrComponent: dto.itemCodeOrComponent,
      quantity: dto.quantity,
    }, user, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { items: result.getValue() };
  }

  @Patch('buildings/:buildingId/contractors/:contractorId/boq/items/:itemCode')
  @ApiOperation({ summary: 'Update contractor item assigned quantity' })
  @RequirePermission(Permissions.ContractorBoq.Write)
  async updateQuantity(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Param('itemCode') itemCode: string,
    @Body() dto: UpdateContractorItemQuantityDto,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.updateQty.execute({
      buildingId,
      contractorId,
      itemCode,
      componentId: dto.componentId,
      quantity: dto.quantity,
    }, user, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { items: result.getValue() };
  }

  @Delete('buildings/:buildingId/contractors/:contractorId/boq/items/:itemCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove contractor BOQ item' })
  @RequirePermission(Permissions.ContractorBoq.Write)
  async remove(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Param('itemCode') itemCode: string,
    @Query('componentId') componentId?: string,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.removeItem.execute(
      buildingId,
      contractorId,
      itemCode,
      componentId,
      user,
      userId,
    );
    if (result.isFailure) throw this.mapError(result.error);
  }

  @Get('buildings/:buildingId/contractors/:contractorId/boq/available')
  @ApiOperation({ summary: 'Available qty for contractor item/component' })
  @RequirePermission(Permissions.ContractorBoq.Read)
  async available(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Query('itemCode') itemCode: string,
    @Query('componentId') componentId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.availableQty.execute({
      buildingId,
      contractorId,
      itemCode,
      componentId,
    }, user);
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
