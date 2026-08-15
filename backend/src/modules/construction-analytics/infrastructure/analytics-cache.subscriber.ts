import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { DomainEvent } from '@/modules/domain-events/domain/event-bus.interface';
import { AnalyticsCacheService } from './analytics-cache.service';

/**
 * Keeps the analytics cache coherent with data writes.
 *
 * The cache is memoized with a TTL (see AnalyticsCacheService). Without this
 * subscriber, edits to extracts, payments, purchases, attendance, etc. could be
 * reflected in dashboards only after the TTL expires. This subscriber listens to
 * every domain event and clears the cache immediately, so dashboards always
 * reflect the latest data on the next request.
 */
@Injectable()
export class AnalyticsCacheSubscriber implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsCacheSubscriber.name);

  constructor(
    private readonly eventBus: EventBusImpl,
    private readonly cache: AnalyticsCacheService,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe('*', {
      handle: async (_event: DomainEvent) => {
        this.cache.invalidateAll();
      },
    });
    this.logger.log('Analytics cache subscriber listening for data-change events');
  }
}
