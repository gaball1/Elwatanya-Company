export interface DomainEvent {
  readonly eventName: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly payload: Record<string, any>;
  readonly occurredOn: Date;
  readonly correlationId?: string;
  readonly metadata?: Record<string, any>;
}

export interface EventHandler {
  handle(event: DomainEvent): Promise<void>;
}

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
  getEvents(aggregateId: string): Promise<DomainEvent[]>;
}
