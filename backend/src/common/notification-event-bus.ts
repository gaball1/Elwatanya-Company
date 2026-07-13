// src/common/notification-event-bus.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventBus, DomainEvent } from './event-bus.interface';

/**
 * Stub implementation of the EventBus that simply logs events.
 * In production an actual Notification module will be injected
 * that forwards the events to email, push, or audit services.
 */
@Injectable()
export class NotificationEventBus implements EventBus {
  private readonly logger = new Logger(NotificationEventBus.name);

  async publish(event: DomainEvent): Promise<void> {
    // Log the event – the real implementation will be swapped via DI.
    this.logger.log(`Event published: ${event.name}`, JSON.stringify(event.payload));
  }
}
