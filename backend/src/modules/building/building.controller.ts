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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateBuildingUseCase } from './application/use-cases/create-building.use-case';
import { UpdateBuildingUseCase } from './application/use-cases/update-building.use-case';
import { GetBuildingUseCase } from './application/use-cases/get-building.use-case';
import { ListBuildingsByProjectUseCase } from './application/use-cases/list-buildings-by-project.use-case';
import { ListAllBuildingsUseCase } from './application/use-cases/list-all-buildings.use-case';
import { SoftDeleteBuildingUseCase } from './application/use-cases/soft-delete-building.use-case';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from './application/errors/building-application.error';
import { CreateBuildingDto, UpdateBuildingDto } from './dto/building.dto';

@ApiTags('Buildings')
@ApiBearerAuth()
@Controller()
export class BuildingController {
  constructor(
    private readonly createBuilding: CreateBuildingUseCase,
    private readonly updateBuilding: UpdateBuildingUseCase,
    private readonly getBuilding: GetBuildingUseCase,
    private readonly listBuildingsByProject: ListBuildingsByProjectUseCase,
    private readonly listAllBuildings: ListAllBuildingsUseCase,
    private readonly softDeleteBuilding: SoftDeleteBuildingUseCase,
  ) {}
  @Post('projects/:projectId/buildings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a building under a project' })
  @RequirePermission(Permissions.Buildings.Create)
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateBuildingDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.createBuilding.execute({
      projectId,
      name: dto.name,
      code: dto.code,
      type: dto.type,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      description: dto.description,
      status: dto.status,
      latitude: dto.latitude,
      longitude: dto.longitude,
      allowedRadius: dto.allowedRadius,
    }, user);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { building: result.getValue() };
  }

  @Get('projects/:projectId/buildings')
  @ApiOperation({ summary: 'List buildings for a project' })
  @RequirePermission(Permissions.Buildings.Read)
  async listByProject(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.listBuildingsByProject.execute(projectId, user);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { buildings: result.getValue() };
  }

  @Get('buildings')
  @ApiOperation({ summary: 'List all buildings' })
  @RequirePermission(Permissions.Buildings.Read)
  async listAll() {
    const result = await this.listAllBuildings.execute();
    if (result.isFailure) {
      throw new BadRequestException(result.error?.message ?? 'Failed to list buildings');
    }
    return { items: result.getValue() };
  }

  @Get('buildings/:id')
  @ApiOperation({ summary: 'Get building by id' })
  @RequirePermission(Permissions.Buildings.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.getBuilding.execute(id, user);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { building: result.getValue() };
  }
  @Patch('buildings/:id')
  @ApiOperation({ summary: 'Update building' })
  @RequirePermission(Permissions.Buildings.Update)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBuildingDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.updateBuilding.execute({
      buildingId: id,
      name: dto.name,
      code: dto.code,
      type: dto.type,
      startDate: dto.startDate !== undefined ? new Date(dto.startDate) : undefined,
      description: dto.description,
      status: dto.status,
      latitude: dto.latitude,
      longitude: dto.longitude,
      allowedRadius: dto.allowedRadius,
    }, user);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { building: result.getValue() };
  }
  @Delete('buildings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a building' })
  @RequirePermission(Permissions.Buildings.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.softDeleteBuilding.execute(id, user);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
  }

  private mapError(error: Error | undefined): Error {
    if (error instanceof BuildingApplicationError) {
      switch (error.code) {
        case BuildingErrorCode.NOT_FOUND:
        case BuildingErrorCode.PROJECT_NOT_FOUND:
          return new NotFoundException(error.message);
        case BuildingErrorCode.NAME_ALREADY_EXISTS:
          return new ConflictException(error.message);
        default:
          return new BadRequestException(error.message);
      }
    }
    return new BadRequestException(error?.message ?? 'Building operation failed');
  }
}
