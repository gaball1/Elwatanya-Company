import { Injectable } from '@nestjs/common';
import { NotificationEventBus } from '@/common/notification-event-bus';
import { DomainEvent } from '@/shared/kernel/domain-event';
import { UserRegisteredEvent } from '../domain/events/user-registered.event';
import { IDomainEventPublisher } from '../application/ports/domain-event-publisher.port';

@Injectable()
export class CommonDomainEventPublisher implements IDomainEventPublisher {
  constructor(private readonly eventBus: NotificationEventBus) {}

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.eventBus.publish({
        name: event.eventName,
        payload: this.toPayload(event),
      });
    }
  }

  private toPayload(event: DomainEvent): Record<string, unknown> {
    if (event instanceof UserRegisteredEvent) {
      return {
        userId: event.userId.toValue(),
        email: event.email,
      };
    }

    return { occurredOn: event.occurredOn };
  }
}
