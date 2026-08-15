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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { SelfAttendance, SelfAttendanceGuard } from '../../common/guards/self-attendance.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { AttendanceOverrideService } from './attendance-override.service';
import { CreateOverrideDto, ApproveRejectDto, UpdateReasonDto } from './dto/attendance-override.dto';

@ApiTags('Attendance Override')
@ApiBearerAuth()
@Controller('attendance-override')
export class AttendanceOverrideController {
  constructor(
    private readonly service: AttendanceOverrideService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an override request (self-service for linked employees)' })
  @UseGuards(SelfAttendanceGuard)
  @SelfAttendance(Permissions.Attendance.Create)
  async create(@Body() dto: CreateOverrideDto, @Request() req: any, @CurrentUser() user: JwtPayload) {
    // Self-service: the caller may only create a request for their own employee.
    const isPrivileged = user.permissions?.includes(Permissions.Attendance.Create);

    if (dto.attendanceId) {
      const attendance = await this.prisma.attendance.findFirst({
        where: { id: dto.attendanceId, deletedAt: null },
        select: { employeeId: true },
      });
      if (!attendance) throw new NotFoundException('Attendance record not found');
      if (user.employeeId && !isPrivileged && attendance.employeeId !== user.employeeId) {
        throw new NotFoundException('Attendance record not found');
      }
    }

    return this.service.create({
      attendanceId: dto.attendanceId,
      requestedBy: req.user?.sub ?? dto.requestedBy,
      reason: dto.reason,
      type: dto.type ?? 'check_in',
      distance: dto.distance,
      snapshot:
        user.employeeId && !isPrivileged
          ? { ...(dto.snapshot ?? {}), employeeId: user.employeeId }
          : dto.snapshot,
      auditedBy: req.user?.sub ?? dto.requestedBy,
      ip: req.ip,
    });
  }

  @Patch(':id/reason')
  @ApiOperation({ summary: 'Update the reason of a pending override request (self-service for linked employees)' })
  @UseGuards(SelfAttendanceGuard)
  @SelfAttendance(Permissions.Attendance.Create)
  async updateReason(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReasonDto,
    @Request() req: any,
    @CurrentUser() user: JwtPayload,
  ) {
    const isPrivileged = user.permissions?.includes(Permissions.Attendance.Create);
    if (user.employeeId && !isPrivileged) {
      const existing = await this.prisma.attendanceOverride.findUnique({
        where: { id },
        select: { employeeId: true, status: true },
      });
      if (!existing || existing.employeeId !== user.employeeId) {
        throw new NotFoundException('Override request not found');
      }
    }
    return this.service.updateReason(id, dto.reason, req.user?.sub ?? null, req.ip);
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

  @Get('mine')
  @ApiOperation({ summary: 'List the current user\'s own override requests (self-service)' })
  @UseGuards(SelfAttendanceGuard)
  @SelfAttendance(Permissions.Attendance.Create)
  async findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMine(user.employeeId);
  }

  @Get()
  @ApiOperation({ summary: 'List override requests (management only)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (pending, approved, rejected)' })
  @RequirePermission(Permissions.Attendance.Update)
  async findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }
}
