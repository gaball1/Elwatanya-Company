import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PermissionsController } from './permissions.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
})
export class PermissionsModule {}
