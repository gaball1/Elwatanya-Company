import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { AttendanceOverrideService } from '@/modules/attendance-override/attendance-override.service';
import { AttendanceOverrideModule } from '@/modules/attendance-override/attendance-override.module';
import { NotificationService } from '@/common/services/notification.service';
import { ATTENDANCE_REPOSITORY, IAttendanceRepository } from './domain/attendance.repository';
import { PrismaAttendanceRepository } from './infrastructure/prisma-attendance.repository';
import { ListAttendanceUseCase } from './application/use-cases/list-attendance.use-case';
import { ListMyAttendanceUseCase } from './application/use-cases/list-my-attendance.use-case';
import { GetAttendanceUseCase } from './application/use-cases/get-attendance.use-case';
import { CreateAttendanceUseCase } from './application/use-cases/create-attendance.use-case';
import { CheckOutUseCase } from './application/use-cases/check-out.use-case';
import { UpdateAttendanceUseCase } from './application/use-cases/update-attendance.use-case';
import { DeleteAttendanceUseCase } from './application/use-cases/delete-attendance.use-case';
import { AttendanceDashboardUseCase } from './application/use-cases/attendance-dashboard.use-case';
import { AttendanceController } from './attendance.controller';

@Module({
  imports: [PrismaModule, AttendanceOverrideModule],
  controllers: [AttendanceController],
  providers: [
    { provide: ATTENDANCE_REPOSITORY, useClass: PrismaAttendanceRepository },
    {
      provide: ListAttendanceUseCase,
      useFactory: (repo: IAttendanceRepository) => new ListAttendanceUseCase(repo),
      inject: [ATTENDANCE_REPOSITORY],
    },
    {
      provide: ListMyAttendanceUseCase,
      useFactory: (repo: IAttendanceRepository) => new ListMyAttendanceUseCase(repo),
      inject: [ATTENDANCE_REPOSITORY],
    },
    {
      provide: GetAttendanceUseCase,
      useFactory: (repo: IAttendanceRepository) => new GetAttendanceUseCase(repo),
      inject: [ATTENDANCE_REPOSITORY],
    },
    {
      provide: CreateAttendanceUseCase,
      useFactory: (
        repo: IAttendanceRepository,
        eventBus: EventBusImpl,
        prisma: PrismaService,
        overrideService: AttendanceOverrideService,
        notifications: NotificationService,
      ) => new CreateAttendanceUseCase(repo, eventBus, prisma, overrideService, notifications),
      inject: [ATTENDANCE_REPOSITORY, EventBusImpl, PrismaService, AttendanceOverrideService, NotificationService],
    },
    {
      provide: CheckOutUseCase,
      useFactory: (
        repo: IAttendanceRepository,
        eventBus: EventBusImpl,
        prisma: PrismaService,
        overrideService: AttendanceOverrideService,
        notifications: NotificationService,
      ) => new CheckOutUseCase(repo, eventBus, prisma, overrideService, notifications),
      inject: [ATTENDANCE_REPOSITORY, EventBusImpl, PrismaService, AttendanceOverrideService, NotificationService],
    },
    {
      provide: UpdateAttendanceUseCase,
      useFactory: (repo: IAttendanceRepository) => new UpdateAttendanceUseCase(repo),
      inject: [ATTENDANCE_REPOSITORY],
    },
    {
      provide: DeleteAttendanceUseCase,
      useFactory: (repo: IAttendanceRepository) => new DeleteAttendanceUseCase(repo),
      inject: [ATTENDANCE_REPOSITORY],
    },
    AttendanceDashboardUseCase,
  ],
  exports: [ATTENDANCE_REPOSITORY],
})
export class AttendanceModule {}