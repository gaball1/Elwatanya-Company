import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CLIENT_REPOSITORY } from './domain/client.repository';
import { IClientRepository } from './domain/client.repository';
import { PrismaClientRepository } from './infrastructure/prisma-client.repository';
import { GetClientUseCase } from './application/use-cases/get-client.use-case';
import { ListClientsUseCase } from './application/use-cases/list-clients.use-case';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case';
import { DeleteClientUseCase } from './application/use-cases/delete-client.use-case';
import { ClientController } from './client.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ClientController],
  providers: [
    { provide: CLIENT_REPOSITORY, useClass: PrismaClientRepository },
    {
      provide: GetClientUseCase,
      useFactory: (repo: IClientRepository) => new GetClientUseCase(repo),
      inject: [CLIENT_REPOSITORY],
    },
    {
      provide: ListClientsUseCase,
      useFactory: (repo: IClientRepository) => new ListClientsUseCase(repo),
      inject: [CLIENT_REPOSITORY],
    },
    {
      provide: CreateClientUseCase,
      useFactory: (repo: IClientRepository) => new CreateClientUseCase(repo),
      inject: [CLIENT_REPOSITORY],
    },
    {
      provide: UpdateClientUseCase,
      useFactory: (repo: IClientRepository) => new UpdateClientUseCase(repo),
      inject: [CLIENT_REPOSITORY],
    },
    {
      provide: DeleteClientUseCase,
      useFactory: (repo: IClientRepository) => new DeleteClientUseCase(repo),
      inject: [CLIENT_REPOSITORY],
    },
  ],
  exports: [CLIENT_REPOSITORY],
})
export class ClientModule {}
