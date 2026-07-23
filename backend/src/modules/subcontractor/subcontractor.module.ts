import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SUBCONTRACTOR_REPOSITORY } from './domain/subcontractor.repository';
import { ISubcontractorRepository } from './domain/subcontractor.repository';
import { PrismaSubcontractorRepository } from './infrastructure/prisma-subcontractor.repository';
import { ListSubcontractorsUseCase } from './application/use-cases/list-subcontractors.use-case';
import { SubcontractorController } from './subcontractor.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SubcontractorController],
  providers: [
    { provide: SUBCONTRACTOR_REPOSITORY, useClass: PrismaSubcontractorRepository },
    {
      provide: ListSubcontractorsUseCase,
      useFactory: (repo: ISubcontractorRepository) => new ListSubcontractorsUseCase(repo),
      inject: [SUBCONTRACTOR_REPOSITORY],
    },
  ],
  exports: [SUBCONTRACTOR_REPOSITORY],
})
export class SubcontractorModule {}
