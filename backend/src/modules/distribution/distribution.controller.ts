import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
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
  FinalBoqApplicationError,
  FinalBoqErrorCode,
} from '@/modules/final-boq/application/errors/final-boq-application.error';
import { DistributeComponentUseCase } from './application/use-cases/distribute-component.use-case';
import { DistributeItemUseCase } from './application/use-cases/distribute-item.use-case';
import { RemoveDistributionUseCase } from './application/use-cases/remove-distribution.use-case';
import { DistributeComponentDto, DistributeItemDto } from './dto/distribution.dto';

@ApiTags('Distribution')
@ApiBearerAuth()
@Controller()
export class DistributionController {
  constructor(
    private readonly distributeComponent: DistributeComponentUseCase,
    private readonly distributeItem: DistributeItemUseCase,
    private readonly removeDistribution: RemoveDistributionUseCase,
  ) {}

  @Post('buildings/:buildingId/boq/final/items/:itemCode/components/:componentId/distribute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Distribute component to contractors (mirrors distributeComponent)' })
  @RequirePermission(Permissions.Distribution.Write)
  async distribute(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Param('componentId', ParseUUIDPipe) componentId: string,
    @Body() dto: DistributeComponentDto,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.distributeComponent.execute({
      buildingId,
      itemCode,
      componentId,
      distribution: dto.distribution,
    }, user, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { item: result.getValue() };
  }

  @Post('buildings/:buildingId/boq/final/items/:itemCode/distribute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Distribute non-analyzed final item to contractors (item-level)' })
  @RequirePermission(Permissions.Distribution.Write)
  async distributeItemEndpoint(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Body() dto: DistributeItemDto,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.distributeItem.execute({
      buildingId,
      itemCode,
      distribution: dto.distribution,
    }, user, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { item: result.getValue() };
  }

  @Delete('buildings/:buildingId/boq/final/items/:itemCode/components/:componentId/contractors/:contractorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a contractor allocation for a component (undo distribution)' })
  @RequirePermission(Permissions.Distribution.Write)
  async removeComponentDistribution(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Param('componentId', ParseUUIDPipe) componentId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.removeDistribution.execute({
      buildingId,
      itemCode,
      componentId,
      contractorId,
    }, user, userId);
    if (result.isFailure) throw this.mapError(result.error);
    return { item: result.getValue() };
  }

  @Delete('buildings/:buildingId/boq/final/items/:itemCode/contractors/:contractorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a contractor allocation for a final item (undo distribution)' })
  @RequirePermission(Permissions.Distribution.Write)
  async removeItemDistribution(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.removeDistribution.execute({
      buildingId,
      itemCode,
      contractorId,
    }, user, userId);
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
          return new NotFoundException(error.message);
        default:
          return new BadRequestException(error.message);
      }
    }
    return new BadRequestException(error?.message ?? 'Distribution failed');
  }
}
