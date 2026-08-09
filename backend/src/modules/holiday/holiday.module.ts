import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { HOLIDAY_REPOSITORY } from './domain/holiday.repository';
import { IHolidayRepository } from './domain/holiday.repository';
import { PrismaHolidayRepository } from './infrastructure/prisma-holiday.repository';
import { ListHolidaysUseCase } from './application/use-cases/list-holidays.use-case';
import { CreateHolidayUseCase } from './application/use-cases/create-holiday.use-case';
import { UpdateHolidayUseCase } from './application/use-cases/update-holiday.use-case';
import { DeleteHolidayUseCase } from './application/use-cases/delete-holiday.use-case';
import { HolidayController } from './holiday.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HolidayController],
  providers: [
    { provide: HOLIDAY_REPOSITORY, useClass: PrismaHolidayRepository },
    {
      provide: ListHolidaysUseCase,
      useFactory: (repo: IHolidayRepository) => new ListHolidaysUseCase(repo),
      inject: [HOLIDAY_REPOSITORY],
    },
    {
      provide: CreateHolidayUseCase,
      useFactory: (repo: IHolidayRepository) => new CreateHolidayUseCase(repo),
      inject: [HOLIDAY_REPOSITORY],
    },
    {
      provide: UpdateHolidayUseCase,
      useFactory: (repo: IHolidayRepository) => new UpdateHolidayUseCase(repo),
      inject: [HOLIDAY_REPOSITORY],
    },
    {
      provide: DeleteHolidayUseCase,
      useFactory: (repo: IHolidayRepository) => new DeleteHolidayUseCase(repo),
      inject: [HOLIDAY_REPOSITORY],
    },
  ],
  exports: [HOLIDAY_REPOSITORY],
})
export class HolidayModule {}
