import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { FinancialService } from '@/common/services/financial.service';
import { MISCELLANEOUS_REPOSITORY } from './domain/miscellaneous.repository';
import { IMiscellaneousRepository } from './domain/miscellaneous.repository';
import { PrismaMiscellaneousRepository } from './infrastructure/prisma-miscellaneous.repository';
import { ListMiscellaneousUseCase } from './application/use-cases/list-miscellaneous.use-case';
import { CreateMiscellaneousUseCase } from './application/use-cases/create-miscellaneous.use-case';
import { UpdateMiscellaneousUseCase } from './application/use-cases/update-miscellaneous.use-case';
import { DeleteMiscellaneousUseCase } from './application/use-cases/delete-miscellaneous.use-case';
import { MiscellaneousController } from './miscellaneous.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MiscellaneousController],
  providers: [
    FinancialService,
    { provide: MISCELLANEOUS_REPOSITORY, useClass: PrismaMiscellaneousRepository },
    {
      provide: ListMiscellaneousUseCase,
      useFactory: (repo: IMiscellaneousRepository) => new ListMiscellaneousUseCase(repo),
      inject: [MISCELLANEOUS_REPOSITORY],
    },
    {
      provide: CreateMiscellaneousUseCase,
      useFactory: (repo: IMiscellaneousRepository, fs: FinancialService, prisma: PrismaService) =>
        new CreateMiscellaneousUseCase(repo, fs, prisma),
      inject: [MISCELLANEOUS_REPOSITORY, FinancialService, PrismaService],
    },
    {
      provide: UpdateMiscellaneousUseCase,
      useFactory: (repo: IMiscellaneousRepository) => new UpdateMiscellaneousUseCase(repo),
      inject: [MISCELLANEOUS_REPOSITORY],
    },
    {
      provide: DeleteMiscellaneousUseCase,
      useFactory: (repo: IMiscellaneousRepository, fs: FinancialService, prisma: PrismaService) =>
        new DeleteMiscellaneousUseCase(repo, fs, prisma),
      inject: [MISCELLANEOUS_REPOSITORY, FinancialService, PrismaService],
    },
  ],
  exports: [MISCELLANEOUS_REPOSITORY],
})
export class MiscellaneousModule {}
