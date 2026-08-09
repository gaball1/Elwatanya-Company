import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PrismaService } from '@/prisma/prisma.service';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all available permissions' })
  @RequirePermission('roles.read')
  async list() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });
    return { items: permissions };
  }
}
