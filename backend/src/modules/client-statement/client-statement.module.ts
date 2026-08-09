import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CLIENT_STATEMENT_REPOSITORY } from './domain/client-statement.repository';
import { IClientStatementRepository } from './domain/client-statement.repository';
import { PrismaClientStatementRepository } from './infrastructure/prisma-client-statement.repository';
import { ListClientStatementsUseCase } from './application/use-cases/list-client-statements.use-case';
import { CreateClientStatementUseCase } from './application/use-cases/create-client-statement.use-case';
import { UpdateClientStatementUseCase } from './application/use-cases/update-client-statement.use-case';
import { DeleteClientStatementUseCase } from './application/use-cases/delete-client-statement.use-case';
import { ClientStatementController } from './client-statement.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ClientStatementController],
  providers: [
    { provide: CLIENT_STATEMENT_REPOSITORY, useClass: PrismaClientStatementRepository },
    { provide: ListClientStatementsUseCase, useFactory: (r: IClientStatementRepository) => new ListClientStatementsUseCase(r), inject: [CLIENT_STATEMENT_REPOSITORY] },
    { provide: CreateClientStatementUseCase, useFactory: (r: IClientStatementRepository) => new CreateClientStatementUseCase(r), inject: [CLIENT_STATEMENT_REPOSITORY] },
    { provide: UpdateClientStatementUseCase, useFactory: (r: IClientStatementRepository) => new UpdateClientStatementUseCase(r), inject: [CLIENT_STATEMENT_REPOSITORY] },
    { provide: DeleteClientStatementUseCase, useFactory: (r: IClientStatementRepository) => new DeleteClientStatementUseCase(r), inject: [CLIENT_STATEMENT_REPOSITORY] },
  ],
  exports: [CLIENT_STATEMENT_REPOSITORY],
})
export class ClientStatementModule {}
