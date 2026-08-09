import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { BuildingSubcontractorController } from './building-subcontractor.controller';
import { BuildingSubcontractorService } from './application/building-subcontractor.service';

@Module({
  imports: [PrismaModule],
  controllers: [BuildingSubcontractorController],
  providers: [BuildingSubcontractorService],
})
export class BuildingSubcontractorModule {}
