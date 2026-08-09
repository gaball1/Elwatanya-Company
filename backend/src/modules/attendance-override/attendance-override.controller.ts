import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { AttendanceOverrideService } from './attendance-override.service';
import { CreateOverrideDto, ApproveRejectDto } from './dto/attendance-override.dto';

@ApiTags('Attendance Override')
@ApiBearerAuth()
@Controller('attendance-override')
export class AttendanceOverrideController {
  constructor(private readonly service: AttendanceOverrideService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an override request' })
  @RequirePermission(Permissions.Attendance.Create)
  async create(@Body() dto: CreateOverrideDto, @Request() req: any) {
    return this.service.create({
      attendanceId: dto.attendanceId,
      requestedBy: dto.requestedBy,
      reason: dto.reason,
      type: dto.type ?? 'check_in',
      distance: dto.distance,
      snapshot: dto.snapshot,
      auditedBy: req.user?.sub ?? dto.requestedBy,
      ip: req.ip,
    });
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve an override request' })
  @RequirePermission(Permissions.Attendance.Update)
  async approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveRejectDto, @Request() req: any) {
    return this.service.approve(id, dto.comment, req.user?.sub ?? null, req.ip);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject an override request' })
  @RequirePermission(Permissions.Attendance.Update)
  async reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveRejectDto, @Request() req: any) {
    return this.service.reject(id, dto.comment, req.user?.sub ?? null, req.ip);
  }

  @Get()
  @ApiOperation({ summary: 'List override requests' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (pending, approved, rejected)' })
  @RequirePermission(Permissions.Attendance.Read)
  async findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }
}