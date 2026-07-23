import { DomainEvent } from '@/shared/kernel/domain-event';

export const DOMAIN_EVENT_PUBLISHER = Symbol('DOMAIN_EVENT_PUBLISHER');

export interface IDomainEventPublisher {
  publish(events: DomainEvent[]): Promise<void>;
}
