import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventHandler, EventBus } from './domain/event-bus.interface';
import { EventStoreService } from './event-store.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class EventBusImpl implements EventBus {
  private readonly logger = new Logger(EventBusImpl.name);
  private handlers = new Map<string, EventHandler[]>();
  private readonly instanceId = uuid().slice(0, 8);

  constructor(private readonly eventStore: EventStoreService) {}

  async publish(event: DomainEvent): Promise<void> {
    const enriched: DomainEvent = {
      ...event,
      occurredOn: event.occurredOn ?? new Date(),
      metadata: {
        ...event.metadata,
        publisherInstance: this.instanceId,
      },
    };

    await this.eventStore.append(enriched);

    const handlers = this.handlers.get(event.eventName) ?? [];
    const wildcardHandlers = this.handlers.get('*') ?? [];

    for (const handler of [...handlers, ...wildcardHandlers]) {
      try {
        await handler.handle(enriched);
      } catch (err) {
        this.logger.error(`Handler failed for ${event.eventName}: ${(err as Error).message}`);
      }
    }
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
    this.logger.log(`Handler subscribed to '${eventName}'`);
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    return this.eventStore.getEventsByAggregate(aggregateId);
  }
}
