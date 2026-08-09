import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { EventBusImpl } from './event-bus.impl';
import { EventStoreService } from './event-store.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    EventBusImpl,
    EventStoreService,
    {
      provide: 'EventBus',
      useExisting: EventBusImpl,
    },
  ],
  exports: [EventBusImpl, EventStoreService, 'EventBus'],
})
export class DomainEventsModule {}
