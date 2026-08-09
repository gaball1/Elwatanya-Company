import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { ShiftService } from './shift.service';
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';

@ApiTags('Shifts')
@ApiBearerAuth()
@Controller('shifts')
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Get()
  @ApiOperation({ summary: 'List all shifts' })
  @RequirePermission(Permissions.Attendance.Read)
  async findAll() {
    return this.shiftService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shift by id' })
  @RequirePermission(Permissions.Attendance.Read)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a shift' })
  @RequirePermission(Permissions.Attendance.Create)
  async create(@Body() dto: CreateShiftDto) {
    return this.shiftService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shift' })
  @RequirePermission(Permissions.Attendance.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateShiftDto) {
    return this.shiftService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a shift' })
  @RequirePermission(Permissions.Attendance.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.shiftService.remove(id);
  }
}
