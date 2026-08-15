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
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import {
  ListAllExtractsUseCase,
  ListExtractsUseCase,
  GetExtractMetaUseCase,
  SaveExtractUseCase,
  GetExtractByIdUseCase,
  DeleteExtractUseCase,
} from './application/use-cases/extract.use-cases';
import { SaveExtractDto } from './dto/extract.dto';

@ApiTags('Extracts')
@ApiBearerAuth()
@Controller()
export class ExtractController {
  constructor(
    private readonly listAllExtracts: ListAllExtractsUseCase,
    private readonly listExtracts: ListExtractsUseCase,
    private readonly getMeta: GetExtractMetaUseCase,
    private readonly saveExtract: SaveExtractUseCase,
    private readonly getById: GetExtractByIdUseCase,
    private readonly deleteExtract: DeleteExtractUseCase,
  ) {}

  @Get('extracts')
  @ApiOperation({ summary: 'List all extracts across projects (for top-level statements page)' })
  @RequirePermission(Permissions.Extracts.Read)
  async listAll(@CurrentUser() user?: JwtPayload) {
    const result = await this.listAllExtracts.execute(user);
    if (result.isFailure) throw this.mapError(result.error);
    return { items: result.getValue() };
  }

  @Get('buildings/:buildingId/contractors/:contractorId/extracts')
  @ApiOperation({ summary: 'List extracts (mirrors getExtracts)' })
  @RequirePermission(Permissions.Extracts.Read)
  async list(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Query('meta') meta?: string,
    @Query('runningNumber') runningNumber?: string,
    @Query('status') status?: 'running' | 'final',
    @CurrentUser() user?: JwtPayload,
  ) {
    if (meta === '1') {
      const result = await this.getMeta.execute({
        buildingId,
        contractorId,
        status: status ?? 'running',
        runningNumber: runningNumber ? Number(runningNumber) : undefined,
      }, user);
      if (result.isFailure) throw this.mapError(result.error);
      return result.getValue();
    }

    const result = await this.listExtracts.execute(buildingId, contractorId, user);
    if (result.isFailure) throw this.mapError(result.error);
    return { items: result.getValue() };
  }

  @Get('buildings/:buildingId/contractors/:contractorId/extracts/:extractId')
  @ApiOperation({ summary: 'Get extract by id' })
  @RequirePermission(Permissions.Extracts.Read)
  async getOne(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Param('extractId', ParseUUIDPipe) extractId: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.getById.execute(buildingId, contractorId, extractId, user);
    if (result.isFailure) throw this.mapError(result.error);
    const value = result.getValue();
    if (!value) throw new NotFoundException('Extract not found');
    return { extract: value };
  }

  @Post('buildings/:buildingId/contractors/:contractorId/extracts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create extract (mirrors saveExtract)' })
  @RequirePermission(Permissions.Extracts.Write)
  async create(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Body() dto: SaveExtractDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.saveExtract.execute({
      ...dto,
      buildingId,
      contractorId,
      manualDeductions: dto.manualDeductions,
    }, user);
    if (result.isFailure) throw this.mapError(result.error);
    return { extract: result.getValue() };
  }

  @Put('buildings/:buildingId/contractors/:contractorId/extracts/:extractId')
  @ApiOperation({ summary: 'Update extract' })
  @RequirePermission(Permissions.Extracts.Write)
  async update(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Param('extractId', ParseUUIDPipe) extractId: string,
    @Body() dto: SaveExtractDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.saveExtract.execute({
      ...dto,
      id: extractId,
      buildingId,
      contractorId,
    }, user);
    if (result.isFailure) throw this.mapError(result.error);
    return { extract: result.getValue() };
  }

  @Delete('buildings/:buildingId/contractors/:contractorId/extracts/:extractId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete extract' })
  @RequirePermission(Permissions.Extracts.Delete)
  async remove(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('extractId', ParseUUIDPipe) extractId: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.deleteExtract.execute(extractId, buildingId, user);
    if (result.isFailure) throw this.mapError(result.error);
  }

  private mapError(error: Error | undefined): Error {
    if (error instanceof BuildingApplicationError) {
      if (error.code === BuildingErrorCode.NOT_FOUND) {
        return new NotFoundException(error.message);
      }
      return new BadRequestException(error.message);
    }
    return new BadRequestException(error?.message ?? 'Extract operation failed');
  }
}
