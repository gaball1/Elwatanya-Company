import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { OwnershipService } from '@/common/services/ownership.service';
import { SUBCONTRACTOR_STATEMENT_REPOSITORY } from './domain/subcontractor-statement.repository';
import { ISubcontractorStatementRepository } from './domain/subcontractor-statement.repository';
import { PrismaSubcontractorStatementRepository } from './infrastructure/prisma-subcontractor-statement.repository';
import { ListSubcontractorStatementsUseCase } from './application/use-cases/list-subcontractor-statements.use-case';
import { CreateSubcontractorStatementUseCase } from './application/use-cases/create-subcontractor-statement.use-case';
import { UpdateSubcontractorStatementUseCase } from './application/use-cases/update-subcontractor-statement.use-case';
import { DeleteSubcontractorStatementUseCase } from './application/use-cases/delete-subcontractor-statement.use-case';
import { SubcontractorStatementController } from './subcontractor-statement.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SubcontractorStatementController],
  providers: [
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    { provide: SUBCONTRACTOR_STATEMENT_REPOSITORY, useClass: PrismaSubcontractorStatementRepository },
    { provide: ListSubcontractorStatementsUseCase, useFactory: (r: ISubcontractorStatementRepository, ownership: OwnershipService) => new ListSubcontractorStatementsUseCase(r, ownership), inject: [SUBCONTRACTOR_STATEMENT_REPOSITORY, OwnershipService] },
    { provide: CreateSubcontractorStatementUseCase, useFactory: (r: ISubcontractorStatementRepository, ownership: OwnershipService) => new CreateSubcontractorStatementUseCase(r, ownership), inject: [SUBCONTRACTOR_STATEMENT_REPOSITORY, OwnershipService] },
    { provide: UpdateSubcontractorStatementUseCase, useFactory: (r: ISubcontractorStatementRepository, ownership: OwnershipService) => new UpdateSubcontractorStatementUseCase(r, ownership), inject: [SUBCONTRACTOR_STATEMENT_REPOSITORY, OwnershipService] },
    { provide: DeleteSubcontractorStatementUseCase, useFactory: (r: ISubcontractorStatementRepository, ownership: OwnershipService) => new DeleteSubcontractorStatementUseCase(r, ownership), inject: [SUBCONTRACTOR_STATEMENT_REPOSITORY, OwnershipService] },
  ],
  exports: [SUBCONTRACTOR_STATEMENT_REPOSITORY],
})
export class SubcontractorStatementModule {}
