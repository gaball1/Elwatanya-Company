import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode,
  HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '@/prisma/prisma.service';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

class CreateRbacRoleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

class UpdateRbacRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

@ApiTags('Admin RBAC Roles')
@ApiBearerAuth()
@Controller('admin/roles')
export class RbacRolesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List RBAC roles with permissions' })
  @RequirePermission('roles.read')
  async list() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: { select: { id: true, name: true, description: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      items: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        permissions: r.permissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          description: rp.permission.description,
        })),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get RBAC role by ID' })
  @RequirePermission('roles.read')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: { select: { id: true, name: true, description: true } } },
        },
      },
    });

    if (!role) throw new NotFoundException('Role not found');

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create RBAC role' })
  @RequirePermission('roles.create')
  async create(@Body() dto: CreateRbacRoleDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Role name is required');

    const existing = await this.prisma.role.findUnique({ where: { name: dto.name.trim() } });
    if (existing) throw new BadRequestException('Role with this name already exists');

    const role = await this.prisma.role.create({
      data: {
        name: dto.name.trim(),
        description: dto.description ?? '',
        permissions: dto.permissionIds?.length
          ? { create: dto.permissionIds.map((pid) => ({ permissionId: pid })) }
          : undefined,
      },
      include: {
        permissions: {
          include: { permission: { select: { id: true, name: true } } },
        },
      },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => ({ id: rp.permission.id, name: rp.permission.name })),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update RBAC role' })
  @RequirePermission('roles.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRbacRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    if (dto.permissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (dto.permissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: dto.permissionIds.map((pid) => ({ roleId: id, permissionId: pid })),
        });
      }
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: {
        permissions: {
          include: { permission: { select: { id: true, name: true } } },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isSystem: updated.isSystem,
      permissions: updated.permissions.map((rp) => ({ id: rp.permission.id, name: rp.permission.name })),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete RBAC role' })
  @RequirePermission('roles.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot delete system roles');

    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.userRoleAssignment.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
  }
}
