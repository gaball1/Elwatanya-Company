import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
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
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { ListEmployerBoqItemsUseCase } from './application/use-cases/list-employer-boq-items.use-case';
import { SetEmployerBoqItemsUseCase } from './application/use-cases/set-employer-boq-items.use-case';
import { UpsertEmployerBoqItemUseCase } from './application/use-cases/upsert-employer-boq-item.use-case';
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
  ) {}

  @Get('buildings/:buildingId/boq/employer')
  @ApiOperation({ summary: 'List employer BOQ items for a building' })
  async list(@Param('buildingId', ParseUUIDPipe) buildingId: string) {
    const result = await this.listEmployerBoqItems.execute(buildingId);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { items: result.getValue() };
  }

  @Post('buildings/:buildingId/boq/employer/items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update a single employer BOQ item' })
  async upsert(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: UpsertEmployerBoqItemDto,
  ) {
    const result = await this.upsertEmployerBoqItem.execute({
      buildingId,
      itemCode: dto.itemCode,
      description: dto.description,
      unit: dto.unit,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
    });
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { item: result.getValue() };
  }

  @Put('buildings/:buildingId/boq/employer')
  @ApiOperation({ summary: 'Replace all employer BOQ items for a building' })
  async replaceAll(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: SetEmployerBoqItemsDto,
  ) {
    const result = await this.setEmployerBoqItems.execute({
      buildingId,
      items: dto.items,
    });
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { items: result.getValue() };
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
        default:
          return new BadRequestException(error.message);
      }
    }

    return new BadRequestException(error?.message ?? 'Employer BOQ operation failed');
  }
}
