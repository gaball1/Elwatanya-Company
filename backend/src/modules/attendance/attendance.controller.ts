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
import { GetAttendanceUseCase } from './application/use-cases/get-attendance.use-case';
import { ListAttendanceUseCase } from './application/use-cases/list-attendance.use-case';
import { CreateAttendanceUseCase } from './application/use-cases/create-attendance.use-case';
import { CheckOutUseCase } from './application/use-cases/check-out.use-case';
import { UpdateAttendanceUseCase } from './application/use-cases/update-attendance.use-case';
import { DeleteAttendanceUseCase } from './application/use-cases/delete-attendance.use-case';
import { AttendanceDashboardUseCase } from './application/use-cases/attendance-dashboard.use-case';
import { CreateAttendanceDto, CheckOutDto, UpdateAttendanceDto } from './dto/attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly getAttendance: GetAttendanceUseCase,
    private readonly listAttendance: ListAttendanceUseCase,
    private readonly createAttendance: CreateAttendanceUseCase,
    private readonly checkOutUseCase: CheckOutUseCase,
    private readonly updateAttendance: UpdateAttendanceUseCase,
    private readonly deleteAttendance: DeleteAttendanceUseCase,
    private readonly dashboardUseCase: AttendanceDashboardUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List attendance records' })
  @RequirePermission(Permissions.Attendance.Read)
  async list() {
    const result = await this.listAttendance.execute();
    return { items: result.getValue() };
  }

  @Get('stats/dashboard')
  @ApiOperation({ summary: 'Get today\'s attendance dashboard statistics' })
  @RequirePermission(Permissions.Attendance.Read)
  async dashboard() {
    return this.dashboardUseCase.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attendance record by id' })
  @RequirePermission(Permissions.Attendance.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getAttendance.execute(id);
    const record = result.getValue();
    if (!record) throw new NotFoundException('Attendance record not found');
    return { record };
  }

  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Check in for the day' })
  @RequirePermission(Permissions.Attendance.Create)
  async checkIn(@Body() dto: CreateAttendanceDto) {
    const result = await this.createAttendance.execute({
      employeeId: dto.employeeId,
      date: new Date(dto.date),
      checkInTime: new Date(dto.checkInTime),
      checkInLatitude: dto.checkInLatitude,
      checkInLongitude: dto.checkInLongitude,
      checkInAddress: dto.checkInAddress,
      checkInAccuracy: dto.checkInAccuracy,
      checkInSelfie: dto.checkInSelfie,
      deviceInfo: dto.deviceInfo,
      distanceFromSite: dto.distanceFromSite,
      projectId: dto.projectId,
      buildingId: dto.buildingId,
      notes: dto.notes,
    });
    if (result.isFailure) handleError(result.error, 'Check-in failed');
    const outcome = result.getValue();
    if ('override' in outcome) {
      return { requiresApproval: true, override: outcome.override };
    }
    return { record: outcome.record };
  }

  @Post(':id/check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check out for the day' })
  @RequirePermission(Permissions.Attendance.Update)
  async checkOut(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CheckOutDto) {
    const result = await this.checkOutUseCase.execute({
      id,
      checkOutTime: new Date(dto.checkOutTime),
      checkOutLatitude: dto.checkOutLatitude,
      checkOutLongitude: dto.checkOutLongitude,
      checkOutAddress: dto.checkOutAddress,
      checkOutAccuracy: dto.checkOutAccuracy,
      checkOutSelfie: dto.checkOutSelfie,
      distanceFromSite: dto.distanceFromSite,
      notes: dto.notes,
    });
    if (result.isFailure) handleError(result.error, 'Check-out failed');
    const outcome = result.getValue();
    if ('override' in outcome) {
      return { requiresApproval: true, override: outcome.override };
    }
    return { record: outcome.record };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an attendance record (legacy)' })
  @RequirePermission(Permissions.Attendance.Create)
  async create(@Body() dto: CreateAttendanceDto) {
    return this.checkIn(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an attendance record' })
  @RequirePermission(Permissions.Attendance.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAttendanceDto) {
    const result = await this.updateAttendance.execute({
      id,
      employeeId: dto.employeeId,
      date: dto.date !== undefined ? new Date(dto.date) : undefined,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      status: dto.status,
      hoursWorked: dto.hoursWorked,
      latitude: dto.latitude,
      longitude: dto.longitude,
      notes: dto.notes,
    });
    if (result.isFailure) handleError(result.error, 'Failed to update attendance record');
    return { record: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an attendance record' })
  @RequirePermission(Permissions.Attendance.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteAttendance.execute(id);
    if (result.isFailure) throw new BadRequestException(result.error?.message ?? 'Failed to delete attendance record');
  }
}
