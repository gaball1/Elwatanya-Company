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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetEmployeeUseCase } from './application/use-cases/get-employee.use-case';
import { GetCurrentEmployeeUseCase } from './application/use-cases/get-current-employee.use-case';
import { ListEmployeesUseCase } from './application/use-cases/list-employees.use-case';
import { CreateEmployeeUseCase } from './application/use-cases/create-employee.use-case';
import { UpdateEmployeeUseCase } from './application/use-cases/update-employee.use-case';
import { DeleteEmployeeUseCase } from './application/use-cases/delete-employee.use-case';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeeController {
  constructor(
    private readonly getEmployee: GetEmployeeUseCase,
    private readonly getCurrentEmployee: GetCurrentEmployeeUseCase,
    private readonly listEmployees: ListEmployeesUseCase,
    private readonly createEmployee: CreateEmployeeUseCase,
    private readonly updateEmployee: UpdateEmployeeUseCase,
    private readonly deleteEmployee: DeleteEmployeeUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the employee linked to the current user (self-service)' })
  async me(@CurrentUser('sub') userId?: string) {
    if (!userId) throw new BadRequestException('Missing user identity');
    const result = await this.getCurrentEmployee.execute(userId);
    if (result.isFailure) handleError(result.error?.message, 'Failed to load current employee');
    const employee = result.getValue();
    if (!employee) throw new NotFoundException('No employee is linked to this account');
    return { employee };
  }

  @Get()
  @ApiOperation({ summary: 'List employees' })
  @RequirePermission(Permissions.Employees.Read)
  async list() {
    const result = await this.listEmployees.execute();
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by id' })
  @RequirePermission(Permissions.Employees.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getEmployee.execute(id);
    const employee = result.getValue();
    if (!employee) throw new NotFoundException('Employee not found');
    return { employee };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an employee' })
  @RequirePermission(Permissions.Employees.Create)
  async create(@Body() dto: CreateEmployeeDto) {
    const result = await this.createEmployee.execute({
      code: dto.code,
      fullName: dto.fullName,
      nationalId: dto.nationalId,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      departmentId: dto.departmentId,
      roleId: dto.roleId,
      salary: dto.salary,
      status: dto.status,
      notes: dto.notes,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create employee');
    return { employee: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee' })
  @RequirePermission(Permissions.Employees.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    const result = await this.updateEmployee.execute({
      id,
      code: dto.code,
      fullName: dto.fullName,
      nationalId: dto.nationalId,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      birthDate: dto.birthDate !== undefined ? new Date(dto.birthDate) : undefined,
      hireDate: dto.hireDate !== undefined ? new Date(dto.hireDate) : undefined,
      departmentId: dto.departmentId,
      roleId: dto.roleId,
      salary: dto.salary,
      status: dto.status,
      notes: dto.notes,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update employee');
    return { employee: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an employee' })
  @RequirePermission(Permissions.Employees.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteEmployee.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete employee');
  }
}
