import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
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
    { provide: SUBCONTRACTOR_STATEMENT_REPOSITORY, useClass: PrismaSubcontractorStatementRepository },
    { provide: ListSubcontractorStatementsUseCase, useFactory: (r: ISubcontractorStatementRepository) => new ListSubcontractorStatementsUseCase(r), inject: [SUBCONTRACTOR_STATEMENT_REPOSITORY] },
    { provide: CreateSubcontractorStatementUseCase, useFactory: (r: ISubcontractorStatementRepository) => new CreateSubcontractorStatementUseCase(r), inject: [SUBCONTRACTOR_STATEMENT_REPOSITORY] },
    { provide: UpdateSubcontractorStatementUseCase, useFactory: (r: ISubcontractorStatementRepository) => new UpdateSubcontractorStatementUseCase(r), inject: [SUBCONTRACTOR_STATEMENT_REPOSITORY] },
    { provide: DeleteSubcontractorStatementUseCase, useFactory: (r: ISubcontractorStatementRepository) => new DeleteSubcontractorStatementUseCase(r), inject: [SUBCONTRACTOR_STATEMENT_REPOSITORY] },
  ],
  exports: [SUBCONTRACTOR_STATEMENT_REPOSITORY],
})
export class SubcontractorStatementModule {}
