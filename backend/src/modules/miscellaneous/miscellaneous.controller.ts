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
import { ListMiscellaneousUseCase } from './application/use-cases/list-miscellaneous.use-case';
import { CreateMiscellaneousUseCase } from './application/use-cases/create-miscellaneous.use-case';
import { UpdateMiscellaneousUseCase } from './application/use-cases/update-miscellaneous.use-case';
import { DeleteMiscellaneousUseCase } from './application/use-cases/delete-miscellaneous.use-case';
import { CreateMiscellaneousDto, UpdateMiscellaneousDto } from './dto/miscellaneous.dto';

@ApiTags('Miscellaneous')
@ApiBearerAuth()
@Controller('miscellaneous')
export class MiscellaneousController {
  constructor(
    private readonly listMiscellaneous: ListMiscellaneousUseCase,
    private readonly createMiscellaneous: CreateMiscellaneousUseCase,
    private readonly updateMiscellaneous: UpdateMiscellaneousUseCase,
    private readonly deleteMiscellaneous: DeleteMiscellaneousUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List miscellaneous records' })
  @RequirePermission(Permissions.Miscellaneous.Read)
  async list() {
    const result = await this.listMiscellaneous.execute();
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get miscellaneous record by id' })
  @RequirePermission(Permissions.Miscellaneous.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.listMiscellaneous.execute();
    const record = result.getValue()?.find((m) => m.id === id);
    if (!record) throw new NotFoundException('Miscellaneous record not found');
    return { miscellaneous: record };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a miscellaneous record' })
  @RequirePermission(Permissions.Miscellaneous.Create)
  async create(@Body() dto: CreateMiscellaneousDto) {
    const result = await this.createMiscellaneous.execute({
      projectId: dto.projectId,
      description: dto.description,
      amount: dto.amount,
      category: dto.category,
      date: new Date(dto.date),
      notes: dto.notes,
      createdBy: dto.createdBy,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create miscellaneous record');
    return { miscellaneous: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update miscellaneous record' })
  @RequirePermission(Permissions.Miscellaneous.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMiscellaneousDto) {
    const result = await this.updateMiscellaneous.execute({
      id,
      description: dto.description,
      amount: dto.amount,
      category: dto.category,
      date: dto.date !== undefined ? new Date(dto.date) : undefined,
      notes: dto.notes,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update miscellaneous record');
    return { miscellaneous: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a miscellaneous record' })
  @RequirePermission(Permissions.Miscellaneous.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteMiscellaneous.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete miscellaneous record');
  }
}
