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
import { CreateBuildingUseCase } from './application/use-cases/create-building.use-case';
import { UpdateBuildingUseCase } from './application/use-cases/update-building.use-case';
import { GetBuildingUseCase } from './application/use-cases/get-building.use-case';
import { ListBuildingsByProjectUseCase } from './application/use-cases/list-buildings-by-project.use-case';
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
    private readonly softDeleteBuilding: SoftDeleteBuildingUseCase,
  ) {}
  @Post('projects/:projectId/buildings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a building under a project' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateBuildingDto,
  ) {
    const result = await this.createBuilding.execute({
      projectId,
      name: dto.name,
    });
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { building: result.getValue() };
  }

  @Get('projects/:projectId/buildings')
  @ApiOperation({ summary: 'List buildings for a project' })
  async listByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    const result = await this.listBuildingsByProject.execute(projectId);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { buildings: result.getValue() };
  }

  @Get('buildings/:id')
  @ApiOperation({ summary: 'Get building by id' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getBuilding.execute(id);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { building: result.getValue() };
  }
  @Patch('buildings/:id')
  @ApiOperation({ summary: 'Update building name' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBuildingDto,
  ) {
    const result = await this.updateBuilding.execute({
      buildingId: id,
      name: dto.name,
    });
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { building: result.getValue() };
  }
  @Delete('buildings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a building' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.softDeleteBuilding.execute(id);
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
