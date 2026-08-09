import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
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
import {
  FinalBoqApplicationError,
  FinalBoqErrorCode,
} from '@/modules/final-boq/application/errors/final-boq-application.error';
import { DistributeComponentUseCase } from './application/use-cases/distribute-component.use-case';
import { DistributeComponentDto } from './dto/distribution.dto';

@ApiTags('Distribution')
@ApiBearerAuth()
@Controller()
export class DistributionController {
  constructor(private readonly distributeComponent: DistributeComponentUseCase) {}

  @Post('buildings/:buildingId/boq/final/items/:itemCode/components/:componentId/distribute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Distribute component to contractors (mirrors distributeComponent)' })
  @RequirePermission(Permissions.Distribution.Write)
  async distribute(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('itemCode') itemCode: string,
    @Param('componentId', ParseUUIDPipe) componentId: string,
    @Body() dto: DistributeComponentDto,
    @CurrentUser('projectId') projectId?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.distributeComponent.execute({
      buildingId,
      itemCode,
      componentId,
      distribution: dto.distribution,
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
          return new NotFoundException(error.message);
        default:
          return new BadRequestException(error.message);
      }
    }
    return new BadRequestException(error?.message ?? 'Distribution failed');
  }
}
