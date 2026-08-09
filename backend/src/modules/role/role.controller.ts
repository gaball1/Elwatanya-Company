import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { UpdateRoleUseCase } from './application/use-cases/update-role.use-case';
import { DeleteRoleUseCase } from './application/use-cases/delete-role.use-case';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List roles' })
  @RequirePermission(Permissions.Roles.Read)
  async list() {
    const result = await this.listRoles.execute();
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by id' })
  @RequirePermission(Permissions.Roles.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.listRoles.execute();
    const role = result.getValue()?.find((r) => r.id === id);
    if (!role) throw new NotFoundException('Role not found');
    return { role };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a role' })
  @RequirePermission(Permissions.Roles.Create)
  async create(@Body() dto: CreateRoleDto) {
    const result = await this.createRole.execute({ name: dto.name, description: dto.description, permissions: dto.permissions, status: dto.status });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create role');
    return { role: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role' })
  @RequirePermission(Permissions.Roles.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    const result = await this.updateRole.execute({ id, name: dto.name, description: dto.description, permissions: dto.permissions, status: dto.status });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update role');
    return { role: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a role' })
  @RequirePermission(Permissions.Roles.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteRole.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete role');
  }
}
