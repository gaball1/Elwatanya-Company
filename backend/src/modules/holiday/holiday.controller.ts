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
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { ListHolidaysUseCase } from './application/use-cases/list-holidays.use-case';
import { CreateHolidayUseCase } from './application/use-cases/create-holiday.use-case';
import { UpdateHolidayUseCase } from './application/use-cases/update-holiday.use-case';
import { DeleteHolidayUseCase } from './application/use-cases/delete-holiday.use-case';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto';

@ApiTags('Holidays')
@ApiBearerAuth()
@Controller('holidays')
export class HolidayController {
  constructor(
    private readonly listHolidays: ListHolidaysUseCase,
    private readonly createHoliday: CreateHolidayUseCase,
    private readonly updateHoliday: UpdateHolidayUseCase,
    private readonly deleteHoliday: DeleteHolidayUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List holidays' })
  @RequirePermission(Permissions.Holidays.Read)
  async list() {
    const result = await this.listHolidays.execute();
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get holiday by id' })
  @RequirePermission(Permissions.Holidays.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.listHolidays.execute();
    const holiday = result.getValue()?.find((c) => c.id === id);
    if (!holiday) throw new NotFoundException('Holiday not found');
    return { holiday };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a holiday' })
  @RequirePermission(Permissions.Holidays.Create)
  async create(@Body() dto: CreateHolidayDto) {
    const result = await this.createHoliday.execute({
      name: dto.name,
      date: new Date(dto.date),
      description: dto.description,
      isRecurring: dto.isRecurring,
    });
    if (result.isFailure) handleError(result.error, 'Failed to process request');
    return { holiday: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update holiday' })
  @RequirePermission(Permissions.Holidays.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHolidayDto) {
    const result = await this.updateHoliday.execute({
      id,
      name: dto.name,
      date: dto.date !== undefined ? new Date(dto.date) : undefined,
      description: dto.description,
      isRecurring: dto.isRecurring,
    });
    if (result.isFailure) handleError(result.error, 'Failed to process request');
    return { holiday: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a holiday' })
  @RequirePermission(Permissions.Holidays.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteHoliday.execute(id);
    if (result.isFailure) handleError(result.error, 'Failed to process request');
  }
}
