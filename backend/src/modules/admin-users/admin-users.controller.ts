import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { AdminUsersService } from './admin-users.service';
import {
  CreateUserDto, UpdateUserDto, AssignRolesDto, AssignProjectsDto,
  ResetPasswordDto, QueryUsersDto,
} from './dto/admin-users.dto';

@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with search and filter' })
  @RequirePermission('users.read')
  async list(@Query() query: QueryUsersDto) {
    const items = await this.adminUsers.list(query);
    return { items };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @RequirePermission('users.read')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsers.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @RequirePermission('users.create')
  async create(@Body() dto: CreateUserDto) {
    return this.adminUsers.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @RequirePermission('users.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.adminUsers.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete user' })
  @RequirePermission('users.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.adminUsers.remove(id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate user' })
  @RequirePermission('users.update')
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsers.activate(id);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable user' })
  @RequirePermission('users.update')
  async disable(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsers.disable(id);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset user password' })
  @RequirePermission('users.reset-password')
  async resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto) {
    return this.adminUsers.resetPassword(id, dto);
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Assign roles to user' })
  @RequirePermission('users.assign-role')
  async assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminUsers.assignRoles(id, dto, user.roleNames ?? []);
  }

  @Post(':id/projects')
  @ApiOperation({ summary: 'Assign projects to user' })
  @RequirePermission('users.assign-project')
  async assignProjects(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignProjectsDto) {
    return this.adminUsers.assignProjects(id, dto);
  }
}
