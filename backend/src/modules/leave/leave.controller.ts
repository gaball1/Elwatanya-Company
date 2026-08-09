import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  HttpException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { ListLeavesUseCase } from './application/use-cases/list-leaves.use-case';
import { CreateLeaveUseCase } from './application/use-cases/create-leave.use-case';
import { UpdateLeaveUseCase } from './application/use-cases/update-leave.use-case';
import { DeleteLeaveUseCase } from './application/use-cases/delete-leave.use-case';
import { CreateLeaveDto, UpdateLeaveDto } from './dto/leave.dto';

@ApiTags('Leaves')
@ApiBearerAuth()
@Controller('leaves')
export class LeaveController {
  constructor(
    private readonly listLeaves: ListLeavesUseCase,
    private readonly createLeave: CreateLeaveUseCase,
    private readonly updateLeave: UpdateLeaveUseCase,
    private readonly deleteLeave: DeleteLeaveUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List leaves' })
  @RequirePermission(Permissions.Leaves.Read)
  async list() {
    const result = await this.listLeaves.execute();
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leave by id' })
  @RequirePermission(Permissions.Leaves.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.listLeaves.execute();
    const leave = result.getValue()?.find((c) => c.id === id);
    if (!leave) throw new NotFoundException('Leave not found');
    return { leave };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a leave' })
  @RequirePermission(Permissions.Leaves.Create)
  async create(@Body() dto: CreateLeaveDto) {
    const result = await this.createLeave.execute({
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      daysCount: dto.daysCount,
      reason: dto.reason,
      status: dto.status,
      approvedBy: dto.approvedBy,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create leave');
    return { leave: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update leave' })
  @RequirePermission(Permissions.Leaves.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeaveDto) {
    const result = await this.updateLeave.execute({
      id,
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
      startDate: dto.startDate !== undefined ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate !== undefined ? new Date(dto.endDate) : undefined,
      daysCount: dto.daysCount,
      reason: dto.reason,
      status: dto.status,
      approvedBy: dto.approvedBy,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update leave');
    return { leave: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a leave' })
  @RequirePermission(Permissions.Leaves.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteLeave.execute(id);
    if (result.isFailure) {
      if (result.error?.message?.includes('not found') || result.error?.message?.includes('NotFound')) {
        throw new NotFoundException(result.error.message);
      }
      throw new BadRequestException(result.error?.message ?? 'Failed to delete leave');
    }
  }
}
