import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { BuildingSubcontractorService } from './application/building-subcontractor.service';
import { AssignSubcontractorDto } from './dto/building-subcontractor.dto';

@ApiTags('Building Subcontractors')
@ApiBearerAuth()
@Controller()
export class BuildingSubcontractorController {
  constructor(private readonly service: BuildingSubcontractorService) {}

  @Get('buildings/:buildingId/subcontractors')
  @ApiOperation({ summary: 'List subcontractors assigned to a building' })
  @RequirePermission(Permissions.Buildings.Read)
  async listByBuilding(@Param('buildingId', ParseUUIDPipe) buildingId: string) {
    const items = await this.service.listByBuilding(buildingId);
    return { items };
  }

  @Post('buildings/:buildingId/subcontractors')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a subcontractor to a building' })
  @RequirePermission(Permissions.Buildings.Update)
  async assign(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: AssignSubcontractorDto,
  ) {
    const item = await this.service.assign(
      buildingId,
      dto.subcontractorId,
      dto.workType,
      dto.agreedPrice,
    );
    return { item };
  }

  @Delete('buildings/:buildingId/subcontractors/:subcontractorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a subcontractor from a building' })
  @RequirePermission(Permissions.Buildings.Update)
  async remove(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('subcontractorId', ParseUUIDPipe) subcontractorId: string,
  ) {
    await this.service.remove(buildingId, subcontractorId);
  }
}
