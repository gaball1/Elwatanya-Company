import { Module } from '@nestjs/common';
import { AttendanceOverrideController } from './attendance-override.controller';
import { AttendanceOverrideService } from './attendance-override.service';

@Module({
  controllers: [AttendanceOverrideController],
  providers: [AttendanceOverrideService],
  exports: [AttendanceOverrideService],
})
export class AttendanceOverrideModule {}