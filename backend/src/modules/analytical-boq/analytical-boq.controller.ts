import {
  BadRequestException,
  Body,
  ConflictException,
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { ListAnalyticalBoqItemsUseCase } from './application/use-cases/list-analytical-boq-items.use-case';
import { SetAnalyticalBoqItemsUseCase } from './application/use-cases/set-analytical-boq-items.use-case';
import { UpdateAnalyticalBoqItemUseCase } from './application/use-cases/update-analytical-boq-item.use-case';
import { RemoveAnalyticalBoqItemUseCase } from './application/use-cases/remove-analytical-boq-item.use-case';
import { ImportAnalyticalFromEmployerUseCase } from './application/use-cases/import-analytical-from-employer.use-case';
import {
  AnalyticalBoqApplicationError,
  AnalyticalBoqErrorCode,
} from './application/errors/analytical-boq-application.error';
import {
  ImportAnalyticalFromEmployerDto,
  SetAnalyticalBoqItemsDto,
  UpdateAnalyticalBoqItemDto,
} from './dto/analytical-boq.dto';

@ApiTags('Analytical BOQ')
@ApiBearerAuth()
@Controller()
export class AnalyticalBoqController {
  constructor(
    private readonly listAnalyticalBoqItems: ListAnalyticalBoqItemsUseCase,
    private readonly setAnalyticalBoqItems: SetAnalyticalBoqItemsUseCase,
    private readonly updateAnalyticalBoqItem: UpdateAnalyticalBoqItemUseCase,
    private readonly removeAnalyticalBoqItem: RemoveAnalyticalBoqItemUseCase,
    private readonly importAnalyticalFromEmployer: ImportAnalyticalFromEmployerUseCase,
  ) {}

  @Get('buildings/:buildingId/boq/analytical')
  @ApiOperation({ summary: 'List analytical BOQ items for a building' })
  @RequirePermission(Permissions.AnalyticalBoq.Read)
  async list(@Param('buildingId', ParseUUIDPipe) buildingId: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.listAnalyticalBoqItems.execute(buildingId, user);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { items: result.getValue() };
  }

  @Put('buildings/:buildingId/boq/analytical')
  @ApiOperation({ summary: 'Replace all analytical BOQ items for a building' })
  @RequirePermission(Permissions.AnalyticalBoq.Write)
  async replaceAll(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: SetAnalyticalBoqItemsDto,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.setAnalyticalBoqItems.execute({
      buildingId,
      items: dto.items,
    }, user, userId);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { items: result.getValue() };
  }

  @Patch('buildings/:buildingId/boq/analytical/items/:itemCode')
  @ApiOperation({ summary: 'Update an analytical BOQ item' })
  @RequirePermission(Permissions.AnalyticalBoq.Write)
  async update(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Body() dto: UpdateAnalyticalBoqItemDto,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.updateAnalyticalBoqItem.execute({
      buildingId,
      itemCode,
      description: dto.description,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
    }, user, userId);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { item: result.getValue() };
  }

  @Delete('buildings/:buildingId/boq/analytical/items/:itemCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an analytical BOQ item' })
  @RequirePermission(Permissions.AnalyticalBoq.Write)
  async remove(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.removeAnalyticalBoqItem.execute(buildingId, itemCode, user, userId);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
  }
  @Post('buildings/:buildingId/boq/analytical/import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import an analytical BOQ item from employer BOQ' })
  @RequirePermission(Permissions.AnalyticalBoq.Import)
  async importFromEmployer(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: ImportAnalyticalFromEmployerDto,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.importAnalyticalFromEmployer.execute({
      buildingId,
      itemCode: dto.itemCode,
    }, user, userId);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { item: result.getValue() };
  }

  private mapError(error: Error | undefined): Error {
    if (error instanceof BuildingApplicationError) {
      if (error.code === BuildingErrorCode.NOT_FOUND) {
        return new NotFoundException(error.message);
      }
      return new BadRequestException(error.message);
    }

    if (error instanceof AnalyticalBoqApplicationError) {
      switch (error.code) {
        case AnalyticalBoqErrorCode.ITEM_NOT_FOUND:
        case AnalyticalBoqErrorCode.EMPLOYER_ITEM_NOT_FOUND:
          return new NotFoundException(error.message);
        case AnalyticalBoqErrorCode.ALREADY_IMPORTED:
        case AnalyticalBoqErrorCode.DUPLICATE_ITEM_CODE:
          return new ConflictException(error.message);
        default:
          return new BadRequestException(error.message);
      }
    }

    return new BadRequestException(error?.message ?? 'Analytical BOQ operation failed');
  }
}
