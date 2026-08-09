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
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { ListEmployerBoqItemsUseCase } from './application/use-cases/list-employer-boq-items.use-case';
import { SetEmployerBoqItemsUseCase } from './application/use-cases/set-employer-boq-items.use-case';
import { UpsertEmployerBoqItemUseCase } from './application/use-cases/upsert-employer-boq-item.use-case';
import { DeleteEmployerBoqItemUseCase } from './application/use-cases/delete-employer-boq-item.use-case';
import {
  EmployerBoqApplicationError,
  EmployerBoqErrorCode,
} from './application/errors/employer-boq-application.error';
import {
  SetEmployerBoqItemsDto,
  UpsertEmployerBoqItemDto,
} from './dto/employer-boq.dto';

@ApiTags('Employer BOQ')
@ApiBearerAuth()
@Controller()
export class EmployerBoqController {
  constructor(
    private readonly listEmployerBoqItems: ListEmployerBoqItemsUseCase,
    private readonly setEmployerBoqItems: SetEmployerBoqItemsUseCase,
    private readonly upsertEmployerBoqItem: UpsertEmployerBoqItemUseCase,
    private readonly deleteEmployerBoqItem: DeleteEmployerBoqItemUseCase,
  ) {}

  @Get('buildings/:buildingId/boq/employer')
  @ApiOperation({ summary: 'List employer BOQ items for a building' })
  @RequirePermission(Permissions.EmployerBoq.Read)
  async list(@Param('buildingId', ParseUUIDPipe) buildingId: string, @CurrentUser('projectId') projectId?: string) {
    const result = await this.listEmployerBoqItems.execute(buildingId, projectId);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { items: result.getValue() };
  }

  @Post('buildings/:buildingId/boq/employer/items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update a single employer BOQ item' })
  @RequirePermission(Permissions.EmployerBoq.Write)
  async upsert(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: UpsertEmployerBoqItemDto,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.upsertEmployerBoqItem.execute({
      buildingId,
      itemCode: dto.itemCode,
      description: dto.description,
      unit: dto.unit,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
    }, projectId, userId);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { item: result.getValue() };
  }

  @Put('buildings/:buildingId/boq/employer')
  @ApiOperation({ summary: 'Replace all employer BOQ items for a building' })
  @RequirePermission(Permissions.EmployerBoq.Write)
  async replaceAll(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: SetEmployerBoqItemsDto,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.setEmployerBoqItems.execute({
      buildingId,
      items: dto.items.map((item) => ({
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalValue: item.totalValue ?? 0,
      })),
    }, projectId, userId);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { items: result.getValue() };
  }

  @Delete('buildings/:buildingId/boq/employer/items/:itemCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a single employer BOQ item (cascades to analytical/final)' })
  @RequirePermission(Permissions.EmployerBoq.Write)
  async delete(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.deleteEmployerBoqItem.execute(buildingId, itemCode, projectId, userId);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
  }

  private mapError(error: Error | undefined): Error {
    if (error instanceof BuildingApplicationError) {
      if (error.code === BuildingErrorCode.NOT_FOUND) {
        return new NotFoundException(error.message);
      }
      return new BadRequestException(error.message);
    }

    if (error instanceof EmployerBoqApplicationError) {
      switch (error.code) {
        case EmployerBoqErrorCode.DUPLICATE_ITEM_CODE:
          return new ConflictException(error.message);
        case EmployerBoqErrorCode.ITEM_NOT_FOUND:
          return new NotFoundException(error.message);
        case EmployerBoqErrorCode.BUILDING_NOT_FOUND:
          return new NotFoundException(error.message);
        default:
          return new BadRequestException(error.message);
      }
    }

    return new BadRequestException(error?.message ?? 'Employer BOQ operation failed');
  }
}
