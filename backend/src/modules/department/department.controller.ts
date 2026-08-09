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
import { ListDepartmentsUseCase } from './application/use-cases/list-departments.use-case';
import { CreateDepartmentUseCase } from './application/use-cases/create-department.use-case';
import { UpdateDepartmentUseCase } from './application/use-cases/update-department.use-case';
import { DeleteDepartmentUseCase } from './application/use-cases/delete-department.use-case';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentController {
  constructor(
    private readonly listDepartments: ListDepartmentsUseCase,
    private readonly createDepartment: CreateDepartmentUseCase,
    private readonly updateDepartment: UpdateDepartmentUseCase,
    private readonly deleteDepartment: DeleteDepartmentUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List departments' })
  @RequirePermission(Permissions.Departments.Read)
  async list() {
    const result = await this.listDepartments.execute();
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by id' })
  @RequirePermission(Permissions.Departments.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.listDepartments.execute();
    const department = result.getValue()?.find((d) => d.id === id);
    if (!department) throw new NotFoundException('Department not found');
    return { department };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a department' })
  @RequirePermission(Permissions.Departments.Create)
  async create(@Body() dto: CreateDepartmentDto) {
    const result = await this.createDepartment.execute({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      managerId: dto.managerId,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create department');
    return { department: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update department' })
  @RequirePermission(Permissions.Departments.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    const result = await this.updateDepartment.execute({
      id,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      managerId: dto.managerId,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update department');
    return { department: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a department' })
  @RequirePermission(Permissions.Departments.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteDepartment.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete department');
  }
}
