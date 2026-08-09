import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { RbacRolesController } from './rbac-roles.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminUsersController, RbacRolesController],
  providers: [AdminUsersService],
  exports: [AdminUsersService],
})
export class AdminUsersModule {}
