import {
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
  Query,
} from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import {
  CreateSubcontractorContractUseCase,
  UpdateSubcontractorContractUseCase,
  DeleteSubcontractorContractUseCase,
  ListSubcontractorContractsUseCase,
  GetSubcontractorContractUseCase,
} from './application/use-cases/subcontractor-contract.use-cases';
import {
  CreateSubcontractorContractDto,
  UpdateSubcontractorContractDto,
} from './dto/subcontractor-contract.dto';

@ApiTags('Subcontractor Contracts')
@ApiBearerAuth()
@Controller('subcontractor-contracts')
export class SubcontractorContractController {
  constructor(
    private readonly listContracts: ListSubcontractorContractsUseCase,
    private readonly getContract: GetSubcontractorContractUseCase,
    private readonly createContract: CreateSubcontractorContractUseCase,
    private readonly updateContract: UpdateSubcontractorContractUseCase,
    private readonly deleteContract: DeleteSubcontractorContractUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List subcontractor contracts (optionally filtered by building/subcontractor)' })
  @RequirePermission(Permissions.Subcontractors.Read)
  async list(
    @Query('buildingId') buildingId?: string,
    @Query('subcontractorId') subcontractorId?: string,
  ) {
    const result = await this.listContracts.execute(buildingId, subcontractorId);
    if (result.isFailure) handleError(result.error?.message, 'Failed to list contracts');
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subcontractor contract by id' })
  @RequirePermission(Permissions.Subcontractors.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getContract.execute(id);
    if (result.isFailure || !result.getValue()) {
      throw new NotFoundException('Contract not found');
    }
    return { contract: result.getValue() };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a subcontractor contract' })
  @RequirePermission(Permissions.Subcontractors.Create)
  async create(
    @Body() dto: CreateSubcontractorContractDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.createContract.execute({
      buildingId: dto.buildingId,
      subcontractorId: dto.subcontractorId,
      title: dto.title,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      totalValue: dto.totalValue,
      terms: dto.terms,
      notes: dto.notes,
      status: dto.status,
      createdBy: user?.sub,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create contract');
    return { contract: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subcontractor contract' })
  @RequirePermission(Permissions.Subcontractors.Update)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubcontractorContractDto,
  ) {
    const result = await this.updateContract.execute({
      id,
      title: dto.title,
      startDate: dto.startDate !== undefined ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate !== undefined ? new Date(dto.endDate) : undefined,
      totalValue: dto.totalValue,
      terms: dto.terms,
      notes: dto.notes,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update contract');
    return { contract: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a subcontractor contract' })
  @RequirePermission(Permissions.Subcontractors.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteContract.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete contract');
  }
}
