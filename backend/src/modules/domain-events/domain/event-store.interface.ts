import { DomainEvent } from './event-bus.interface';

export interface IEventStore {
  append(event: DomainEvent): Promise<void>;
  appendMany(events: DomainEvent[]): Promise<void>;
  getEventsByAggregate(aggregateId: string): Promise<DomainEvent[]>;
  getEventsByName(eventName: string, limit?: number): Promise<DomainEvent[]>;
  getEventsSince(since: Date, limit?: number): Promise<DomainEvent[]>;
}
