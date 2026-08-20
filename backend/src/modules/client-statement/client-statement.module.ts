import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { OwnershipService } from '@/common/services/ownership.service';
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
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    { provide: CLIENT_STATEMENT_REPOSITORY, useClass: PrismaClientStatementRepository },
    { provide: ListClientStatementsUseCase, useFactory: (r: IClientStatementRepository, ownership: OwnershipService) => new ListClientStatementsUseCase(r, ownership), inject: [CLIENT_STATEMENT_REPOSITORY, OwnershipService] },
    { provide: CreateClientStatementUseCase, useFactory: (r: IClientStatementRepository, ownership: OwnershipService) => new CreateClientStatementUseCase(r, ownership), inject: [CLIENT_STATEMENT_REPOSITORY, OwnershipService] },
    { provide: UpdateClientStatementUseCase, useFactory: (r: IClientStatementRepository, ownership: OwnershipService) => new UpdateClientStatementUseCase(r, ownership), inject: [CLIENT_STATEMENT_REPOSITORY, OwnershipService] },
    { provide: DeleteClientStatementUseCase, useFactory: (r: IClientStatementRepository, ownership: OwnershipService) => new DeleteClientStatementUseCase(r, ownership), inject: [CLIENT_STATEMENT_REPOSITORY, OwnershipService] },
  ],
  exports: [CLIENT_STATEMENT_REPOSITORY],
})
export class ClientStatementModule {}
