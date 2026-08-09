import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { FileModule } from '../file/file.module';

@Module({
  imports: [PrismaModule, FileModule],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
