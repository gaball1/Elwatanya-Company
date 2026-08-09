import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerRegistryImpl } from './scheduler.registry';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [SchedulerRegistryImpl],
  exports: [SchedulerRegistryImpl],
})
export class SchedulerModule {}
