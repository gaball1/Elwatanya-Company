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
  Patch,
  Post,
} from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { ListSubcontractorsUseCase } from './application/use-cases/list-subcontractors.use-case';
import { GetSubcontractorUseCase } from './application/use-cases/get-subcontractor.use-case';
import { CreateSubcontractorUseCase } from './application/use-cases/create-subcontractor.use-case';
import { UpdateSubcontractorUseCase } from './application/use-cases/update-subcontractor.use-case';
import { DeleteSubcontractorUseCase } from './application/use-cases/delete-subcontractor.use-case';
import { CreateSubcontractorDto, UpdateSubcontractorDto } from './dto/subcontractor.dto';

@ApiTags('Subcontractors')
@ApiBearerAuth()
@Controller('subcontractors')
export class SubcontractorController {
  constructor(
    private readonly listSubcontractors: ListSubcontractorsUseCase,
    private readonly getSubcontractor: GetSubcontractorUseCase,
    private readonly createSubcontractor: CreateSubcontractorUseCase,
    private readonly updateSubcontractor: UpdateSubcontractorUseCase,
    private readonly deleteSubcontractor: DeleteSubcontractorUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List subcontractors' })
  @RequirePermission(Permissions.Subcontractors.Read)
  async list() {
    const result = await this.listSubcontractors.execute();
    return { items: result.getValue() };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a subcontractor' })
  @RequirePermission(Permissions.Subcontractors.Create)
  async create(@Body() dto: CreateSubcontractorDto) {
    const result = await this.createSubcontractor.execute({
      name: dto.name,
      workType: dto.workType,
      marginType: dto.marginType,
      marginValue: dto.marginValue,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error, 'Failed to process request');
    return { subcontractor: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subcontractor by id' })
  @RequirePermission(Permissions.Subcontractors.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getSubcontractor.execute(id);
    if (result.isFailure || !result.getValue()) {
      throw new NotFoundException('Subcontractor not found');
    }
    return { subcontractor: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subcontractor' })
  @RequirePermission(Permissions.Subcontractors.Update)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubcontractorDto,
  ) {
    const result = await this.updateSubcontractor.execute({
      id,
      name: dto.name,
      workType: dto.workType,
      marginType: dto.marginType,
      marginValue: dto.marginValue,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      joinDate: dto.joinDate !== undefined ? new Date(dto.joinDate) : undefined,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error, 'Failed to process request');
    return { subcontractor: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a subcontractor' })
  @RequirePermission(Permissions.Subcontractors.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteSubcontractor.execute(id);
    if (result.isFailure) handleError(result.error, 'Failed to process request');
  }
}
