import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { LEAVE_REPOSITORY } from './domain/leave.repository';
import { ILeaveRepository } from './domain/leave.repository';
import { PrismaLeaveRepository } from './infrastructure/prisma-leave.repository';
import { ListLeavesUseCase } from './application/use-cases/list-leaves.use-case';
import { CreateLeaveUseCase } from './application/use-cases/create-leave.use-case';
import { UpdateLeaveUseCase } from './application/use-cases/update-leave.use-case';
import { DeleteLeaveUseCase } from './application/use-cases/delete-leave.use-case';
import { LeaveController } from './leave.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LeaveController],
  providers: [
    { provide: LEAVE_REPOSITORY, useClass: PrismaLeaveRepository },
    {
      provide: ListLeavesUseCase,
      useFactory: (repo: ILeaveRepository) => new ListLeavesUseCase(repo),
      inject: [LEAVE_REPOSITORY],
    },
    {
      provide: CreateLeaveUseCase,
      useFactory: (repo: ILeaveRepository, prisma: PrismaService) =>
        new CreateLeaveUseCase(repo, prisma),
      inject: [LEAVE_REPOSITORY, PrismaService],
    },
    {
      provide: UpdateLeaveUseCase,
      useFactory: (repo: ILeaveRepository) => new UpdateLeaveUseCase(repo),
      inject: [LEAVE_REPOSITORY],
    },
    {
      provide: DeleteLeaveUseCase,
      useFactory: (repo: ILeaveRepository) => new DeleteLeaveUseCase(repo),
      inject: [LEAVE_REPOSITORY],
    },
  ],
  exports: [LEAVE_REPOSITORY],
})
export class LeaveModule {}
