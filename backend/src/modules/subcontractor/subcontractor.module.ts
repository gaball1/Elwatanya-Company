import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SUBCONTRACTOR_REPOSITORY } from './domain/subcontractor.repository';
import { ISubcontractorRepository } from './domain/subcontractor.repository';
import { PrismaSubcontractorRepository } from './infrastructure/prisma-subcontractor.repository';
import { ListSubcontractorsUseCase } from './application/use-cases/list-subcontractors.use-case';
import { GetSubcontractorUseCase } from './application/use-cases/get-subcontractor.use-case';
import { CreateSubcontractorUseCase } from './application/use-cases/create-subcontractor.use-case';
import { UpdateSubcontractorUseCase } from './application/use-cases/update-subcontractor.use-case';
import { DeleteSubcontractorUseCase } from './application/use-cases/delete-subcontractor.use-case';
import { SubcontractorController } from './subcontractor.controller';
import { NotificationService } from '@/common/services/notification.service';

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
    {
      provide: GetSubcontractorUseCase,
      useFactory: (repo: ISubcontractorRepository) => new GetSubcontractorUseCase(repo),
      inject: [SUBCONTRACTOR_REPOSITORY],
    },
    {
      provide: CreateSubcontractorUseCase,
      useFactory: (repo: ISubcontractorRepository, notifications: NotificationService) => new CreateSubcontractorUseCase(repo, notifications),
      inject: [SUBCONTRACTOR_REPOSITORY, NotificationService],
    },
    {
      provide: UpdateSubcontractorUseCase,
      useFactory: (repo: ISubcontractorRepository) => new UpdateSubcontractorUseCase(repo),
      inject: [SUBCONTRACTOR_REPOSITORY],
    },
    {
      provide: DeleteSubcontractorUseCase,
      useFactory: (repo: ISubcontractorRepository) => new DeleteSubcontractorUseCase(repo),
      inject: [SUBCONTRACTOR_REPOSITORY],
    },
  ],
  exports: [SUBCONTRACTOR_REPOSITORY],
})
export class SubcontractorModule {}
