import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { TIMELINE_REPOSITORY } from './domain/timeline.repository';
import { PrismaTimelineRepository } from './infrastructure/prisma-timeline.repository';
import { TimelineService } from './timeline.service';
import { TimelineSubscriber } from './timeline.subscriber';
import { TimelineController } from './timeline.controller';
import { DomainEventsModule } from '../domain-events/domain-events.module';

@Module({
  imports: [PrismaModule, DomainEventsModule],
  controllers: [TimelineController],
  providers: [
    { provide: TIMELINE_REPOSITORY, useClass: PrismaTimelineRepository },
    TimelineService,
    TimelineSubscriber,
  ],
  exports: [TimelineService],
})
export class TimelineModule {}
